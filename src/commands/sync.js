// filepath: /Users/benasselmeier/Workspace/Code/mb-stands-for-mother-brain/src/commands/sync.js
const { isModerator } = require('../utils/permissions');
const { getTournamentBySlug, getTournamentById } = require('../utils/startgg');
const { addMatch, getPlayerByTag, addOrUpdatePlayer } = require('../utils/dataStore');
const config = require('../../config');

module.exports = {
  name: 'sync',
  description: 'Sync match results from a Start.gg tournament (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to sync tournament results. This command is for moderators only.');
    }
    
    if (args.length < 1) {
      return message.reply('Usage:\n- By slug: `!sync tournament/genesis-9`\n- By ID: `!sync id:12345`');
    }
    
    try {
      // Check if API key is configured
      if (!config.startggApiKey || config.startggApiKey === 'your_startgg_api_key_here') {
        return message.reply('Start.gg API key is not configured. Please add it to your .env file.');
      }
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send('Fetching tournament data from Start.gg...');
      
      let tournamentResponse;
      
      // Check if input is a tournament ID or a slug
      const tournamentInput = args.join(' ');
      
      if (tournamentInput.startsWith('id:')) {
        // Process as tournament ID
        const tournamentId = tournamentInput.substring(3).trim();
        try {
          tournamentResponse = await getTournamentById(tournamentId);
        } catch (error) {
          return loadingMessage.edit(`Error: ${error.message}. Make sure the tournament ID is valid.`);
        }
      } else {
        // Process as tournament slug
        let slug = tournamentInput.toLowerCase();
        
        // Check if the input is a full URL or just a slug
        if (slug.includes('start.gg/')) {
          slug = slug.split('start.gg/')[1];
        } else if (slug.includes('smash.gg/')) {
          slug = slug.split('smash.gg/')[1];
        }
        
        try {
          tournamentResponse = await getTournamentBySlug(slug);
        } catch (error) {
          return loadingMessage.edit(`Error: ${error.message}. Make sure the tournament slug is valid.`);
        }
      }
      
      const tournament = tournamentResponse.tournament;
      
      if (!tournament) {
        return loadingMessage.edit(`Tournament not found. Make sure the tournament slug or ID is correct.`);
      }
      
      // Get the main event (usually the singles event)
      const mainEvent = tournament.events && tournament.events.length > 0 
        ? tournament.events[0] 
        : null;
      
      if (!mainEvent) {
        return loadingMessage.edit(`No events found for this tournament.`);
      }
      
      // Now fetch completed sets from the event
      const STARTGG_API_ENDPOINT = 'https://api.start.gg/gql/alpha';
      const headers = {
        Authorization: `Bearer ${config.startggApiKey}`,
      };
      
      // Dynamically import graphql-request
      const { request, gql } = await import('graphql-request');
      
      const setsQuery = gql`
        query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
          event(id: $eventId) {
            id
            name
            sets(
              page: $page
              perPage: $perPage
              sortType: STANDARD
              filters: {
                state: [3] # 3 = completed sets
              }
            ) {
              pageInfo {
                total
                totalPages
              }
              nodes {
                id
                displayScore
                winnerId
                slots {
                  id
                  entrant {
                    id
                    name
                    participants {
                      player {
                        id
                        gamerTag
                      }
                    }
                  }
                  standing {
                    placement
                  }
                }
              }
            }
          }
        }
      `;
      
      // Get first page to determine total pages
      const eventId = mainEvent.id;
      const perPage = 50;
      const firstPageResponse = await request(
        STARTGG_API_ENDPOINT,
        setsQuery,
        { eventId, page: 1, perPage },
        headers
      );
      
      const totalPages = firstPageResponse.event.sets.pageInfo.totalPages;
      const allSets = [...firstPageResponse.event.sets.nodes];
      
      // Fetch remaining pages if needed
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          loadingMessage.edit(`Fetching sets page ${page}/${totalPages}...`);
          
          const pageResponse = await request(
            STARTGG_API_ENDPOINT,
            setsQuery,
            { eventId, page, perPage },
            headers
          );
          
          allSets.push(...pageResponse.event.sets.nodes);
        }
      }
      
      // Process sets
      loadingMessage.edit(`Found ${allSets.length} sets. Processing...`);
      
      let syncedSets = 0;
      
      for (let page = 1; page <= Math.ceil(allSets.length / 10); page++) {
        const startIdx = (page - 1) * 10;
        const endIdx = Math.min(startIdx + 10, allSets.length);
        const pageSets = allSets.slice(startIdx, endIdx);
        
        syncedSets += await processSets(pageSets, tournament.name);
        
        if (page % 2 === 0) {
          loadingMessage.edit(`Processing page ${page}/${Math.ceil(allSets.length / 10)}...`);
        }
      }
      
      loadingMessage.edit(`✅ Successfully synced ${syncedSets} sets from ${tournament.name}!`);
    } catch (error) {
      console.error('Error in sync command:', error);
      message.reply('There was an error accessing the Start.gg API. Make sure your API key is properly configured.');
    }
  }
};

/**
 * Process sets from Start.gg and add them to the local database
 * @param {Array} sets - Array of set objects from Start.gg API
 * @param {string} tournamentName - Name of the tournament
 * @returns {number} - Number of sets successfully processed
 */
async function processSets(sets, tournamentName) {
  let syncedCount = 0;
  
  for (const set of sets) {
    try {
      // Skip DQs or byes (these typically have null slots or incomplete data)
      if (!set.slots || set.slots.length !== 2 || 
          !set.slots[0].entrant || !set.slots[1].entrant ||
          !set.displayScore) {
        continue;
      }
      
      // Extract player info
      const player1 = {
        id: set.slots[0].entrant.id,
        tag: set.slots[0].entrant.name,
        gamerTag: set.slots[0].entrant.participants?.[0]?.player?.gamerTag || set.slots[0].entrant.name
      };
      
      const player2 = {
        id: set.slots[1].entrant.id,
        tag: set.slots[1].entrant.name,
        gamerTag: set.slots[1].entrant.participants?.[0]?.player?.gamerTag || set.slots[1].entrant.name
      };
      
      // Determine winner and loser
      let winner, loser;
      if (set.winnerId === player1.id) {
        winner = player1;
        loser = player2;
      } else if (set.winnerId === player2.id) {
        winner = player2;
        loser = player1;
      } else {
        // Skip if winner is unclear
        continue;
      }
      
      // Parse score
      const scoreStr = set.displayScore || 'N/A';
      
      // Ensure the players exist in our system
      await ensurePlayerExists(winner.gamerTag);
      await ensurePlayerExists(loser.gamerTag);
      
      // Add match to our system
      await addMatch({
        winner: winner.gamerTag,
        loser: loser.gamerTag,
        score: scoreStr,
        tournament: tournamentName,
        date: new Date().toISOString(),
        source: 'startgg-sync'
      });
      
      syncedCount++;
    } catch (error) {
      console.error('Error processing set:', error);
      // Continue with other sets
      continue;
    }
  }
  
  return syncedCount;
}

/**
 * Ensure a player exists in our system, create if not
 * @param {string} tag - Player's tag
 */
async function ensurePlayerExists(tag) {
  try {
    const playerData = await getPlayerByTag(tag);
    
    if (!playerData) {
      // Player doesn't exist, create a basic entry
      await addOrUpdatePlayer({
        tag: tag,
        discordId: null, // Will be linked when they use !register
        createdAt: new Date().toISOString(),
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        score: 1000, // Starting ELO score
        source: 'startgg-sync'
      });
    }
  } catch (error) {
    console.error(`Error ensuring player ${tag} exists:`, error);
    throw error;
  }
}
