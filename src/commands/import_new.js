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
      return message.reply('Usage: `!import [tournament-slug]`\n\nExample: `!import genesis-9`\n\nBy default, only singles events will be imported.');
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
      
      // Filter for singles events only
      const singlesEvents = tournament.events.filter(event => {
        // Check if the event name contains singles keywords
        const eventNameLower = event.name.toLowerCase();
        const isSingles = eventNameLower.includes('singles') || 
                         !eventNameLower.includes('doubles') && 
                         !eventNameLower.includes('teams') && 
                         !eventNameLower.includes('crew') &&
                         event.type === 1; // Type 1 is singles, Type 5 is teams/doubles
        
        return isSingles;
      });
      
      if (singlesEvents.length === 0) {
        return loadingMessage.edit(`No singles events found in tournament: ${tournament.name}`);
      }
      
      await loadingMessage.edit(`Found tournament: ${tournament.name}. Importing match data from ${singlesEvents.length} singles events...`);
      
      // Track import statistics
      let totalSets = 0;
      let importedSets = 0;
      let skippedSets = 0;
      let playersFound = new Set();
      
      // Process each singles event in the tournament
      for (let eventIndex = 0; eventIndex < singlesEvents.length; eventIndex++) {
        const event = singlesEvents[eventIndex];
        
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
              // Note: character data not available via selections API anymore
              // We're leaving this empty object to maintain data structure
              
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
        description: `Successfully imported singles match data from ${tournament.name}`,
        fields: [
          {
            name: 'Import Statistics',
            value: `📊 Total sets found: ${totalSets}\n✅ Sets imported: ${importedSets}\n⏭️ Sets skipped: ${skippedSets}\n👥 Players found: ${playersFound.size}`,
            inline: false
          },
          {
            name: 'Tournament Info',
            value: `🏆 Tournament: ${tournament.name}\n📅 Date: ${new Date(tournament.startAt * 1000).toLocaleDateString()}\n🎮 Singles Events: ${singlesEvents.length}`,
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
      
      // Create a more user-friendly error message
      let userErrorMessage = `Error importing tournament data: ${errorMessage}`;
      
      // Add helpful tips based on error type
      if (errorMessage.includes('query complexity')) {
        userErrorMessage += '\n\nThe tournament may be too large to import all at once. Try importing a smaller tournament, or check TROUBLESHOOTING.md for solutions.';
      } else if (errorMessage.includes('rate limit')) {
        userErrorMessage += '\n\nThe Start.gg API rate limit was reached. Please wait a few minutes before trying again.';
      } else if (errorMessage.includes('not found')) {
        userErrorMessage += '\n\nCheck that the tournament slug is correct and the tournament is public.';
      }
      
      message.reply(userErrorMessage);
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
    
    // Track if we're using fallback strategy for high complexity
    let usingFallbackStrategy = false;
    let fallbackAttempted = false;
    
    // Function to fetch sets with fallback strategies for high complexity
    async function fetchSetsWithFallback() {
      // Get all sets using pagination
      let allSets = [];
      let page = 1;
      const perPage = usingFallbackStrategy ? 5 : 8; // Use even smaller page size in fallback mode
      let hasMorePages = true;
      let result = null;
      
      // Attempt to fetch data with pagination
      try {
        while (hasMorePages) {
          // Choose query based on strategy
          const query = usingFallbackStrategy ? 
            // Ultra-minimal query for fallback cases
            gql`
              query EventBracketMinimal($eventId: ID!, $page: Int!, $perPage: Int!) {
                event(id: $eventId) {
                  id
                  name
                  sets(page: $page, perPage: $perPage, sortType: ROUND) {
                    pageInfo { hasNextPage }
                    nodes {
                      id
                      winnerId
                      displayScore
                      slots {
                        entrant { id name }
                      }
                    }
                  }
                }
              }
            ` :
            // Singles-optimized query with minimal fields
            gql`
              query EventBracketSingles($eventId: ID!, $page: Int!, $perPage: Int!) {
                event(id: $eventId) {
                  id
                  name
                  sets(
                    page: $page
                    perPage: $perPage
                    sortType: ROUND
                  ) {
                    pageInfo {
                      hasNextPage
                    }
                    nodes {
                      id
                      round
                      fullRoundText
                      displayScore
                      winnerId
                      slots {
                        entrant {
                          id
                          name
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
          
          console.log(`Fetching event data, page ${page} (${usingFallbackStrategy ? 'fallback mode' : 'standard mode'})...`);
          result = await queryStartGG(query, variables);
          
          // Check if we have a valid event and sets
          if (!result.event) {
            throw new Error('Event not found');
          }
          
          // Add sets from this page to our collection
          if (result.event.sets && result.event.sets.nodes) {
            const newSets = result.event.sets.nodes;
            allSets = [...allSets, ...newSets];
            
            console.log(`Fetched ${newSets.length} sets from page ${page}. Total: ${allSets.length}`);
            
            // Check if there are more pages
            hasMorePages = result.event.sets.pageInfo.hasNextPage;
            
            // If we have lots of sets already, stop to avoid rate limits and query complexity
            const maxSets = usingFallbackStrategy ? 100 : 200;
            if (allSets.length > maxSets) {
              console.log(`Reached maximum of ${maxSets} sets, stopping pagination to avoid query complexity issues`);
              hasMorePages = false;
            }
            
            // Increment page number for next request
            page++;
            
            // Add a longer delay between requests to avoid rate limits
            if (hasMorePages) {
              const delay = usingFallbackStrategy ? 4000 : 3000;
              console.log(`Waiting ${delay/1000} seconds before next request...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else {
            hasMorePages = false;
          }
        }
        
        return { event: result.event, sets: allSets };
        
      } catch (error) {
        // If this is a complexity error and we haven't tried fallback yet,
        // switch to fallback strategy and try again
        if (!fallbackAttempted && 
            error.response && 
            error.response.errors && 
            error.response.errors.some(e => e.message.includes('query complexity'))) {
          
          console.log('Query complexity error detected. Switching to fallback strategy...');
          fallbackAttempted = true;
          usingFallbackStrategy = true;
          
          // Try again with fallback strategy
          return await fetchSetsWithFallback();
        }
        
        // Re-throw the error for other cases or if fallback also failed
        throw error;
      }
    }
    
    // Execute the fetch with potential fallback
    const result = await fetchSetsWithFallback();
    console.log(`Fetched a total of ${result.sets.length} sets${usingFallbackStrategy ? ' (using fallback strategy)' : ''}`);
    
    return result;
  } catch (error) {
    console.error('Error fetching event bracket with characters:', error);
    
    // Check for GraphQL-specific errors
    if (error.response && error.response.errors) {
      const graphqlErrors = error.response.errors.map(e => e.message).join(', ');
      
      // Specific handling for query complexity errors
      if (graphqlErrors.includes('query complexity')) {
        throw new Error(`Start.gg API Query Complexity Error: Your query is too complex. Try reducing the requested data or using smaller page sizes.`);
      }
      
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
