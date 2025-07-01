// Fixed version of import_new.js with pagination and query complexity handling
const { getTournamentBySlug } = require('../utils/startgg');
const dataStore = require('../utils/dataStore');

module.exports = {
  name: 'import',
  description: 'Import all matches from a tournament bracket into the database',
  async execute(message, args) {
    // Check for proper permissions
    const { isModerator } = require('../utils/permissions');
    if (!isModerator(message.member)) {
      return message.reply('You need moderator permissions to use this command.');
    }
    
    if (args.length < 1) {
      return message.reply('Usage: `!import [tournament-slug]`\n\nExample: `!import genesis-9`');
    }
    
    try {
      // Get the tournament slug from args
      const tournamentSlug = args[0].trim();
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send(`Fetching tournament data for ${tournamentSlug}...`);
      
      // Format the slug properly if needed
      let formattedSlug = tournamentSlug;
      if (!formattedSlug.includes('/')) {
        formattedSlug = `tournament/${formattedSlug}`;
      }
      
      // Get tournament data
      const tournamentData = await getTournamentBySlug(formattedSlug);
      
      if (!tournamentData || !tournamentData.tournament || !tournamentData.tournament.events) {
        return loadingMessage.edit(`Could not find tournament: ${tournamentSlug}`);
      }
      
      const tournament = tournamentData.tournament;
      await loadingMessage.edit(`Found tournament: ${tournament.name}. Importing match data from ${tournament.events.length} events...`);
      
      // Track import statistics
      let totalSets = 0;
      let importedSets = 0;
      let skippedSets = 0;
      let playersFound = new Set();
      
      // Process each event in the tournament
      for (let eventIndex = 0; eventIndex < tournament.events.length; eventIndex++) {
        const event = tournament.events[eventIndex];
        
        try {
          // Update progress message
          await loadingMessage.edit(`Importing data from event ${eventIndex + 1}/${tournament.events.length}: ${event.name}...`);
          
          // Add a small delay between API calls to avoid rate limiting
          if (eventIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Fetch bracket data for this event with character information
          await loadingMessage.edit(`Fetching data for event: ${event.name} (this may take a moment for large events)...`);
          const bracketData = await fetchEventBracketWithCharacters(event.id);
          
          if (!bracketData.sets || bracketData.sets.length === 0) {
            await loadingMessage.edit(`No matches found for event: ${event.name}. Moving to next event...`);
            continue;
          }
          
          await loadingMessage.edit(`Processing ${bracketData.sets.length} sets from event: ${event.name}...`);
          
          totalSets += bracketData.sets.length;
          
          // Process sets in batches to prevent Discord rate limits on message edits
          const batchSize = 50;
          for (let i = 0; i < bracketData.sets.length; i += batchSize) {
            const currentBatch = bracketData.sets.slice(i, i + batchSize);
            
            if (i > 0 && i % 100 === 0) {
              await loadingMessage.edit(`Processed ${i}/${bracketData.sets.length} sets from event: ${event.name}...`);
            }
            
            // Process each set in the batch
            for (const set of currentBatch) {
              // Skip sets without two players or incomplete data
              if (!set.slots || set.slots.length < 2 || !set.slots[0]?.entrant || !set.slots[1]?.entrant) {
                skippedSets++;
                continue;
              }
              
              // Skip sets that haven't been played yet
              if (!set.winnerId) {
                skippedSets++;
                continue;
              }
              
              // Get player data
              const player1 = set.slots[0].entrant;
              const player2 = set.slots[1].entrant;
              
              // Add players to the set of found players
              playersFound.add(player1.name);
              playersFound.add(player2.name);
              
              // Determine winner and loser
              const winnerId = set.winnerId;
              const winnerName = winnerId === player1.id ? player1.name : player2.name;
              const loserName = winnerId === player1.id ? player2.name : player1.name;
              
              // Get round information
              const roundName = set.round > 0 ? `Winners Round ${set.round}` : `Losers Round ${Math.abs(set.round)}`;
              const fullRoundText = set.fullRoundText || roundName;
              
              // Get score information
              let score = "1-0"; // Default if no score is available
              if (set.displayScore) {
                score = set.displayScore;
              }
              
              // Extract character data if available
              const characterData = {};
              if (set.games && set.games.length > 0) {
                // Try to get character data from games
                for (const game of set.games) {
                  if (game.selections) {
                    for (const selection of game.selections) {
                      if (selection.character && selection.entrant) {
                        const playerName = selection.entrant.id === player1.id ? player1.name : player2.name;
                        if (!characterData[playerName]) {
                          characterData[playerName] = [];
                        }
                        if (!characterData[playerName].includes(selection.character.name)) {
                          characterData[playerName].push(selection.character.name);
                        }
                      }
                    }
                  }
                }
              }
              
              // Prepare match data
              const matchData = {
                winner: winnerName,
                loser: loserName,
                score: score,
                tournament: tournament.name,
                tournamentSlug: tournament.slug,
                event: event.name,
                round: fullRoundText,
                date: new Date(tournament.startAt * 1000).toISOString().split('T')[0], // Format as YYYY-MM-DD
                setId: set.id,
                characters: characterData,
                importedFrom: 'startgg'
              };
              
              // Store the match in the database
              try {
                await storeMatch(matchData);
                importedSets++;
              } catch (error) {
                console.error(`Error storing match ${set.id}:`, error);
                skippedSets++;
              }
            }
          }
          
        } catch (error) {
          console.error(`Error processing event ${event.name}:`, error);
          await loadingMessage.edit(`Error processing event ${event.name}: ${error.message}. Attempting to continue with next event...`);
        }
      }
      
      // Finalize with import statistics
      const successEmbed = {
        color: 0x00AAFF,
        title: `Import Completed: ${tournament.name}`,
        description: `Successfully imported match data from ${tournament.name}`,
        fields: [
          {
            name: 'Import Statistics',
            value: `📊 Total sets found: ${totalSets}\n✅ Sets imported: ${importedSets}\n⏭️ Sets skipped: ${skippedSets}\n👥 Players found: ${playersFound.size}`,
            inline: false
          },
          {
            name: 'Tournament Info',
            value: `🏆 Tournament: ${tournament.name}\n📅 Date: ${new Date(tournament.startAt * 1000).toLocaleDateString()}\n🎮 Events: ${tournament.events.length}`,
            inline: false
          }
        ],
        footer: {
          text: `Use !season add ${tournamentSlug} to add this tournament to the current season`
        },
        timestamp: new Date()
      };
      
      await loadingMessage.edit({ content: null, embeds: [successEmbed] });
      
    } catch (error) {
      console.error('Error in import command:', error);
      
      // Extract the most useful error message
      let errorMessage = error.message;
      if (error.response && error.response.errors && error.response.errors.length > 0) {
        errorMessage = error.response.errors.map(e => e.message).join(', ');
      }
      
      message.reply(`Error importing tournament data: ${errorMessage}`);
    }
  }
};

/**
 * Fetch bracket data for an event from Start.gg API, including character data
 * @param {string} eventId - Event ID
 * @returns {Promise<object>} Bracket data
 */
async function fetchEventBracketWithCharacters(eventId) {
  try {
    const { gql } = await import('graphql-request');
    const { queryStartGG } = require('../utils/startgg');
    
    // Get all sets using pagination
    let allSets = [];
    let page = 1;
    const perPage = 25; // Reduced page size to lower query complexity
    let hasMorePages = true;
    let result = null;
    
    while (hasMorePages) {
      const query = gql`
        query EventBracketWithCharacters($eventId: ID!, $page: Int!, $perPage: Int!) {
          event(id: $eventId) {
            id
            name
            slug
            phases {
              id
              name
            }
            sets(
              page: $page
              perPage: $perPage
              sortType: ROUND
            ) {
              pageInfo {
                total
                totalPages
                page
                perPage
                hasNextPage
              }
              nodes {
                id
                round
                fullRoundText
                displayScore
                winnerId
                phaseGroup {
                  id
                  phase {
                    id
                    name
                  }
                }
                slots {
                  entrant {
                    id
                    name
                  }
                  standing {
                    stats {
                      score {
                        value
                      }
                    }
                  }
                }
                games {
                  orderNum
                  winnerId
                  selections {
                    entrant {
                      id
                    }
                    character {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const variables = {
        eventId,
        page,
        perPage
      };
      
      console.log(`Fetching event data, page ${page}...`);
      result = await queryStartGG(query, variables);
      
      // Check if we have a valid event and sets
      if (!result.event) {
        throw new Error('Event not found');
      }
      
      // Add sets from this page to our collection
      if (result.event.sets && result.event.sets.nodes) {
        allSets = [...allSets, ...result.event.sets.nodes];
        
        // Check if there are more pages
        hasMorePages = result.event.sets.pageInfo.hasNextPage;
        
        // If we have lots of sets already, stop to avoid rate limits
        if (allSets.length > 500) {
          console.log(`Reached maximum of 500 sets, stopping pagination`);
          hasMorePages = false;
        }
        
        // Increment page number for next request
        page++;
        
        // Add a small delay between requests to avoid rate limits
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        hasMorePages = false;
      }
    }
    
    console.log(`Fetched a total of ${allSets.length} sets`);
    
    return {
      event: result ? result.event : { id: eventId, name: 'Unknown Event' },
      sets: allSets
    };
  } catch (error) {
    console.error('Error fetching event bracket with characters:', error);
    
    // Check for GraphQL-specific errors
    if (error.response && error.response.errors) {
      const graphqlErrors = error.response.errors.map(e => e.message).join(', ');
      throw new Error(`GraphQL API Error: ${graphqlErrors}`);
    }
    
    throw error;
  }
}

/**
 * Store a match in the database
 * @param {Object} matchData - Match data to store
 */
async function storeMatch(matchData) {
  // Get existing matches
  const matches = await dataStore.getData('matches') || [];
  
  // Check if this match already exists (by set ID)
  const existingMatchIndex = matches.findIndex(match => match.setId === matchData.setId);
  
  if (existingMatchIndex >= 0) {
    // Update existing match
    matches[existingMatchIndex] = {
      ...matches[existingMatchIndex],
      ...matchData
    };
  } else {
    // Add new match
    matches.push(matchData);
  }
  
  // Save updated matches
  await dataStore.saveData('matches', matches);
  
  // Update player stats
  await updatePlayerStats(matchData);
}

/**
 * Update player stats based on match results
 * @param {Object} matchData - Match data
 */
async function updatePlayerStats(matchData) {
  // Get existing players
  const players = await dataStore.getData('players') || [];
  
  // Find or create player records
  let winnerRecord = players.find(p => p.name && p.name.toLowerCase() === matchData.winner.toLowerCase());
  let loserRecord = players.find(p => p.name && p.name.toLowerCase() === matchData.loser.toLowerCase());
  
  // Create new player records if needed
  if (!winnerRecord) {
    winnerRecord = {
      name: matchData.winner,
      matches: [],
      wins: 0,
      losses: 0
    };
    players.push(winnerRecord);
  }
  
  if (!loserRecord) {
    loserRecord = {
      name: matchData.loser,
      matches: [],
      wins: 0,
      losses: 0
    };
    players.push(loserRecord);
  }
  
  // Check if this match is already in player records
  const winnerHasMatch = winnerRecord.matches && winnerRecord.matches.some(m => m.setId === matchData.setId);
  const loserHasMatch = loserRecord.matches && loserRecord.matches.some(m => m.setId === matchData.setId);
  
  // Only update stats if this is a new match
  if (!winnerHasMatch) {
    if (!winnerRecord.matches) {
      winnerRecord.matches = [];
    }
    
    winnerRecord.matches.push({
      opponent: matchData.loser,
      result: 'win',
      score: matchData.score,
      tournament: matchData.tournament,
      date: matchData.date,
      setId: matchData.setId,
      characters: matchData.characters[matchData.winner] || []
    });
    winnerRecord.wins = (winnerRecord.wins || 0) + 1;
  }
  
  if (!loserHasMatch) {
    if (!loserRecord.matches) {
      loserRecord.matches = [];
    }
    
    loserRecord.matches.push({
      opponent: matchData.winner,
      result: 'loss',
      score: matchData.score,
      tournament: matchData.tournament,
      date: matchData.date,
      setId: matchData.setId,
      characters: matchData.characters[matchData.loser] || []
    });
    loserRecord.losses = (loserRecord.losses || 0) + 1;
  }
  
  // Save updated player data
  await dataStore.saveData('players', players);
}
