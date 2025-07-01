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
        
        // Update progress message
        await loadingMessage.edit(`Importing data from event ${eventIndex + 1}/${tournament.events.length}: ${event.name}...`);
        
        // Fetch bracket data for this event with character information
        try {
          // Add a small delay between API calls to avoid rate limiting
          if (eventIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const bracketData = await fetchEventBracketWithCharacters(event.id);
          
          if (!bracketData.sets || bracketData.sets.length === 0) {
            await loadingMessage.edit(`No matches found for event: ${event.name}. Moving to next event...`);
            continue;
          }
          
          totalSets += bracketData.sets.length;
          
          // Process each set in the event
          for (const set of bracketData.sets) {
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
          
          // Try to get character data from games array if available
          if (set.games && Array.isArray(set.games) && set.games.length > 0) {
            try {
              // Try to get character data from games
              for (const game of set.games) {
                if (game.selections && Array.isArray(game.selections)) {
                  for (const selection of game.selections) {
                    if (selection && selection.character && selection.entrant) {
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
            } catch (error) {
              console.warn(`Warning: Could not process character data for set ${set.id}:`, error.message);
              // Character data is optional, so we can continue without it
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
        } catch (error) {
          console.error(`Error processing event ${event.name}:`, error);
          await loadingMessage.edit(`Error processing event ${event.name}: ${error.message}. Attempting to continue with next event...`);
          skippedSets += (error.bracketData?.sets?.length || 0);
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
    
    const query = gql`
      query EventBracketWithCharacters($eventId: ID!) {
        event(id: $eventId) {
          id
          name
          slug
          phases {
            id
            name
          }
          sets(
            page: 1
            perPage: 100
            sortType: ROUND
          ) {
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
    
    const result = await queryStartGG(query, { eventId });
    
    // Check if we have a valid event and sets
    if (!result.event) {
      throw new Error('Event not found');
    }
    
    if (!result.event.sets || !result.event.sets.nodes) {
      return {
        event: result.event,
        sets: []
      };
    }
    
    return {
      event: result.event,
      sets: result.event.sets.nodes
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
