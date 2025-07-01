const { getTournamentBySlug } = require('../utils/startgg');
const { queryStartGG } = require('../utils/startgg');
const dataStore = require('../utils/dataStore');

// Map to track active bracket messages that can be paginated
const activeBracketMessages = new Map();

// Map to cache sets from bracket queries
const bracketSetCache = new Map();

module.exports = {
  name: 'bracket',
  description: 'Show the bracket path for a tournament event',
  getBracketBySlug,
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: `!bracket [tournament-slug] [event-index]`\n\nExamples:\n• `!bracket genesis-9` - Shows bracket for the first event\n• `!bracket genesis-9 2` - Shows bracket for the second event\n• `!bracket underground-smash-5` - Shows bracket for Underground Smash 5');
    }
    
    try {
      // Get the tournament slug from args
      const tournamentSlug = args[0].trim();
      
      // Check if event index is specified (default to 0 - first event)
      const eventIndex = args.length > 1 ? parseInt(args[1], 10) - 1 : 0;
      if (isNaN(eventIndex) || eventIndex < 0) {
        return message.reply('Event index must be a positive number. Example: `!bracket genesis-9 2` for the second event.');
      }
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send(`Fetching bracket data for ${tournamentSlug}...`);
      
      // Format the slug properly if needed
      let formattedSlug = tournamentSlug;
      if (!formattedSlug.includes('/')) {
        formattedSlug = `tournament/${formattedSlug}`;
      }
      
      try {
        // Get bracket data from our utility function
        const bracketData = await getBracketBySlug(formattedSlug, eventIndex);
        
        if (!bracketData || !bracketData.event) {
          return loadingMessage.edit(`Could not find bracket data for tournament: ${tournamentSlug}`);
        }
        
        const event = bracketData.event;
        const tournament = bracketData.tournament;
        
        // Check if we have phases in the event
        if (!event.phases || event.phases.length === 0) {
          return loadingMessage.edit(`No bracket phases found for event: ${event.name}`);
        }
        
        // Check if we have any sets
        if (!bracketData.sets || bracketData.sets.length === 0) {
          const embed = {
            color: 0x00AAFF,
            title: `${tournament.name} - ${event.name} Bracket`,
            url: `https://start.gg/${tournament.slug}/event/${event.slug}`,
            description: `No matches found in the bracket for ${event.name}. The tournament may not have started yet, or the bracket might not be available.`,
            fields: [{
              name: 'View on Start.gg',
              value: `[Click here to view on Start.gg](https://start.gg/${tournament.slug}/event/${event.slug})`,
              inline: false
            }],
            footer: {
              text: `Use !bracket ${tournamentSlug} [event-index] to view other events`
            },
            timestamp: new Date()
          };
          
          await loadingMessage.edit({ content: null, embeds: [embed] });
          return;
        }
        
        // Group sets by phase
        let setsByPhase = {};
        for (const set of bracketData.sets) {
          // Skip sets without phase info
          if (!set.phaseGroup || !set.phaseGroup.phase) {
            continue;
          }
          
          const phaseId = set.phaseGroup.phase.id;
          if (!setsByPhase[phaseId]) {
            setsByPhase[phaseId] = [];
          }
          setsByPhase[phaseId].push(set);
        }
        
        // Organize phases and rounds for pagination
        const phaseData = [];
        for (const phase of event.phases) {
          const phaseSets = setsByPhase[phase.id] || [];
          
          // Skip phases with no sets
          if (phaseSets.length === 0) continue;
          
          // Group sets by round
          const setsByRound = {};
          phaseSets.forEach(set => {
            const roundName = set.round > 0 ? `Winners Round ${set.round}` : `Losers Round ${Math.abs(set.round)}`;
            if (!setsByRound[roundName]) {
              setsByRound[roundName] = [];
            }
            setsByRound[roundName].push(set);
          });
          
          phaseData.push({
            phase,
            setsByRound,
            roundNames: Object.keys(setsByRound)
          });
        }
        
        // Calculate total number of sets across all phases
        let totalSets = 0;
        phaseData.forEach(phase => {
          Object.keys(phase.setsByRound).forEach(round => {
            totalSets += phase.setsByRound[round].length;
          });
        });
        
        // Collect all sets for caching
        const allSets = [];
        phaseData.forEach(phase => {
          Object.values(phase.setsByRound).forEach(roundSets => {
            allSets.push(...roundSets);
          });
        });

        // Setup pagination data
        const paginationData = {
          tournament,
          event,
          phaseData,
          currentPhaseIndex: 0,
          currentRoundPage: 0,
          roundsPerPage: 3,
          tournamentSlug,
          totalSets,
          sets: allSets, // Store all sets for saving later
          messageCreatedAt: Date.now() // Add a timestamp for age checking
        };
        
        // Skip pagination if there's no meaningful data to paginate
        const needsPagination = 
          paginationData.phaseData.length > 0 && 
          (paginationData.phaseData.length > 1 || 
           (paginationData.phaseData[0].roundNames && 
            paginationData.phaseData[0].roundNames.length > paginationData.roundsPerPage));
        
        // Generate the first page embed
        const embed = generateBracketEmbed(paginationData);
        
        // Send the embed and add reactions for pagination
        const sentMessage = await loadingMessage.edit({ content: null, embeds: [embed] });          // Add pagination reactions if needed
          await sentMessage.react('💾'); // Add save emoji first
          if (needsPagination) {
            await sentMessage.react('⬅️');
            await sentMessage.react('➡️');
          
          // Store pagination data for reaction handler
          activeBracketMessages.set(sentMessage.id, paginationData);
          
          // Set up a collector for reactions
          const filter = (reaction, user) => {
            return ['⬅️', '➡️', '💾'].includes(reaction.emoji.name) && user.id !== sentMessage.author.id;
          };
          
          const collector = sentMessage.createReactionCollector({ filter, time: 300000 }); // 5 minutes
          
          // Log when a collector is created
          console.log(`Created reaction collector for bracket message ID: ${sentMessage.id}`)
          
          collector.on('collect', async (reaction, user) => {
            // Remove user's reaction
            await reaction.users.remove(user.id).catch(error => console.error('Failed to remove reactions: ', error));
            
            // Get current pagination data
            const paginationData = activeBracketMessages.get(sentMessage.id);
            if (!paginationData) return;
            
            // Handle save reaction
            if (reaction.emoji.name === '💾') {
              const loadingMsg = await message.channel.send('Saving bracket sets to database...');
              const result = await saveCachedSets(sentMessage.id);
              await loadingMsg.edit(`✅ Saved ${result.saved} sets to database (${result.skipped} skipped as duplicates)`);
              return;
            }
            
            const currentPhase = paginationData.phaseData[paginationData.currentPhaseIndex];
            const totalRoundPages = Math.ceil(currentPhase.roundNames.length / paginationData.roundsPerPage);
            
            // Handle navigation
            if (reaction.emoji.name === '⬅️') {
              // Go back
              if (paginationData.currentRoundPage > 0) {
                // Previous page of rounds in current phase
                paginationData.currentRoundPage--;
              } else if (paginationData.currentPhaseIndex > 0) {
                // Previous phase
                paginationData.currentPhaseIndex--;
                paginationData.currentRoundPage = Math.ceil(
                  paginationData.phaseData[paginationData.currentPhaseIndex].roundNames.length / 
                  paginationData.roundsPerPage
                ) - 1;
              }
            } else if (reaction.emoji.name === '➡️') {
              // Go forward
              if (paginationData.currentRoundPage < totalRoundPages - 1) {
                // Next page of rounds in current phase
                paginationData.currentRoundPage++;
              } else if (paginationData.currentPhaseIndex < paginationData.phaseData.length - 1) {
                // Next phase
                paginationData.currentPhaseIndex++;
                paginationData.currentRoundPage = 0;
              }
            }
            
            // Update the stored pagination data
            activeBracketMessages.set(sentMessage.id, paginationData);
            
            // Generate and update the embed
            const newEmbed = generateBracketEmbed(paginationData);
            await sentMessage.edit({ embeds: [newEmbed] });
          });
          
          collector.on('end', (collected) => {
            // Log how many reactions were collected during the lifecycle
            console.log(`Bracket message ${sentMessage.id} reaction collector ended. Collected ${collected.size} reactions.`);
            
            // Remove from active messages when collector ends
            activeBracketMessages.delete(sentMessage.id);
            
            // Try to remove reactions when done
            sentMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
          });
        }
      } catch (error) {
        console.error('Error fetching bracket data:', error);
        return loadingMessage.edit(`Error fetching bracket: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in bracket command:', error);
      message.reply('There was an error processing the command. Please check the tournament slug and try again.');
    }
  }
};

/**
 * Generate a bracket embed for the current pagination state
 * @param {Object} paginationData - Data for the current pagination state
 * @returns {Object} Discord embed object
 */
function generateBracketEmbed(paginationData) {
  const { tournament, event, phaseData, currentPhaseIndex, currentRoundPage, roundsPerPage, tournamentSlug } = paginationData;
  
  // Handle case where there are no phases
  if (!phaseData || phaseData.length === 0) {
    return {
      color: 0x00AAFF,
      title: `${tournament.name} - ${event.name} Bracket`,
      url: `https://start.gg/${tournament.slug}/event/${event.slug}`,
      description: `No bracket data found for this event.${paginationData.totalSets ? ` Found ${paginationData.totalSets} total sets.` : ''}`,
      timestamp: new Date()
    };
  }
  
  const currentPhase = phaseData[currentPhaseIndex];
  const totalPhases = phaseData.length;
  const totalRoundPages = Math.ceil(currentPhase.roundNames.length / roundsPerPage);
  
  // Calculate which rounds to show on this page
  const startRoundIndex = currentRoundPage * roundsPerPage;
  const endRoundIndex = Math.min(startRoundIndex + roundsPerPage, currentPhase.roundNames.length);
  const currentRoundNames = currentPhase.roundNames.slice(startRoundIndex, endRoundIndex);
  
  // Create the embed
  const embed = {
    color: 0x00AAFF,
    title: `${tournament.name} - ${event.name} Bracket`,
    url: `https://start.gg/${tournament.slug}/event/${event.slug}`,
    description: `🎮 **Total Sets: ${paginationData.totalSets}**\nShowing bracket path and match results for ${event.name}. Use ⬅️ and ➡️ reactions to navigate.\n\nPhase ${currentPhaseIndex + 1}/${totalPhases}: **${currentPhase.phase.name}**`,
    fields: [],
    footer: {
      text: `Phase ${currentPhaseIndex + 1}/${totalPhases} | Page ${currentRoundPage + 1}/${totalRoundPages} | Use !bracket ${tournamentSlug} [event-index] to view other events`
    },
    timestamp: new Date()
  };
  
  // Add round information
  for (const roundName of currentRoundNames) {
    const roundSets = currentPhase.setsByRound[roundName];
    
    // Create a summary of the round
    let roundText = '';
    for (let i = 0; i < Math.min(roundSets.length, 5); i++) {
      const set = roundSets[i];
      const player1Name = set.slots[0]?.entrant?.name || 'BYE';
      const player2Name = set.slots[1]?.entrant?.name || 'BYE';
      
      if (set.winnerId) {
        const winnerName = set.winnerId === set.slots[0]?.entrant?.id ? player1Name : player2Name;
        roundText += `• **${player1Name}** vs **${player2Name}**\n`;
        roundText += `  └ Winner: **${winnerName}**`;
        
        if (set.displayScore) {
          roundText += ` (${set.displayScore})`;
        }
      } else {
        roundText += `• **${player1Name}** vs **${player2Name}**\n`;
        roundText += `  └ *Match not played yet*`;
      }
      
      roundText += '\n\n';
    }
    
    // If there are more sets than we're showing
    if (roundSets.length > 5) {
      roundText += `*+${roundSets.length - 5} more matches in this round*\n`;
    }
    
    // Add the round as a field
    embed.fields.push({
      name: roundName,
      value: roundText || 'No matches',
      inline: false
    });
  }
  
  // Add navigation hints
  if (totalPhases > 1 || totalRoundPages > 1) {
    let navText = '';
    
    if (currentPhaseIndex > 0 || currentRoundPage > 0) {
      navText += '⬅️ Previous ';
    }
    
    if (currentPhaseIndex < totalPhases - 1 || currentRoundPage < totalRoundPages - 1) {
      navText += '➡️ Next';
    }
    
    if (navText) {
      embed.fields.push({
        name: 'Navigation',
        value: navText + '\n\n*React with these emojis to navigate*',
        inline: false
      });
    }
  }
  
  return embed;
}

/**
 * Get bracket data from Start.gg API
 * @param {string} slug - Tournament slug
 * @param {number} eventIndex - Index of the event (0-based)
 * @returns {Promise<object>} Bracket data
 */
async function getBracketBySlug(slug, eventIndex) {
  try {
    // First get tournament data to get the event ID
    const tournamentData = await getTournamentBySlug(slug);
    
    if (!tournamentData || !tournamentData.tournament || !tournamentData.tournament.events) {
      throw new Error('Tournament not found or has no events');
    }
    
    // Get the event based on index
    const events = tournamentData.tournament.events;
    if (eventIndex >= events.length) {
      throw new Error(`Event index ${eventIndex + 1} out of bounds. Tournament has ${events.length} events`);
    }
    
    const event = events[eventIndex];
    
    // Fetch bracket data for this event
    const bracketData = await fetchEventBracket(event.id);
    
    return {
      tournament: tournamentData.tournament,
      event: event,
      ...bracketData
    };
  } catch (error) {
    console.error('Error getting bracket by slug:', error);
    throw error;
  }
}

/**
 * Fetch bracket data for an event from Start.gg API
 * @param {string} eventId - Event ID
 * @returns {Promise<object>} Bracket data
 */
async function fetchEventBracket(eventId) {
  try {
    const { gql } = await import('graphql-request');
    const { queryStartGG } = require('../utils/startgg');
    
    const query = gql`
      query EventBracket($eventId: ID!) {
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
    console.error('Error fetching event bracket:', error);
    throw error;
  }
}

/**
 * Save cached sets to the database
 * @param {string} messageId - ID of the message containing the bracket
 * @param {object} paginationData - Data about the current bracket view
 * @returns {Promise<{saved: number, skipped: number}>} - Number of sets saved and skipped
 */
async function saveCachedSets(messageId) {
  const paginationData = activeBracketMessages.get(messageId);
  if (!paginationData || !paginationData.sets) {
    return { saved: 0, skipped: 0 };
  }

  let saved = 0;
  let skipped = 0;

  for (const set of paginationData.sets) {
    try {
      // Get winner and loser info
      const [winner, loser] = set.slots[0].entrant.id === set.winnerId ? 
        [set.slots[0].entrant.name, set.slots[1].entrant.name] : 
        [set.slots[1].entrant.name, set.slots[0].entrant.name];

      // Format match data for storage
      const matchData = {
        setId: set.id,
        winner,
        loser,
        score: set.displayScore || "0-0",
        tournament: paginationData.tournament.name,
        eventId: paginationData.event.id,
        eventName: paginationData.event.name,
        round: set.round,
        completedAt: set.completedAt,
        characters: {},
        reportedAt: new Date().toISOString(),
        source: 'bracket-import'
      };

      // Add character data if available
      if (set.games) {
        for (const game of set.games) {
          if (game.selections) {
            for (const selection of game.selections) {
              const playerName = set.slots.find(s => s.entrant.id === selection.entrant.id)?.entrant.name;
              if (playerName && selection.character) {
                if (!matchData.characters[playerName]) {
                  matchData.characters[playerName] = [];
                }
                if (!matchData.characters[playerName].includes(selection.character.name)) {
                  matchData.characters[playerName].push(selection.character.name);
                }
              }
            }
          }
        }
      }

      try {
        // Try to add the match - addMatch will handle duplicate checking
        await dataStore.addMatch(matchData);
        console.log(`Successfully saved match: ${matchData.winner} vs ${matchData.loser} (${matchData.score})`);
        saved++;
      } catch (error) {
        if (error.message?.includes('duplicate')) {
          console.log(`Skipping duplicate match: ${matchData.winner} vs ${matchData.loser}`);
          skipped++;
        } else {
          throw error; // Re-throw if it's not a duplicate error
        }
      }

    } catch (error) {
      console.error('Error saving set:', error);
      skipped++;
    }
  }

  return { saved, skipped };
}

// Export the activeBracketMessages map for potential external use
module.exports.activeBracketMessages = activeBracketMessages;
module.exports.generateBracketEmbed = generateBracketEmbed;
module.exports.getBracketBySlug = getBracketBySlug;
module.exports.fetchEventBracket = fetchEventBracket;
