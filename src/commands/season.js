const { isModerator } = require('../utils/permissions');
const fs = require('fs').promises;
const path = require('path');
const { 
  getAvailableSeasons, 
  createSeason: createSeasonInDB, 
  endCurrentSeason,
  addTournamentToSeason: addTournamentToSeasonInDB,
  removeTournamentFromSeason
} = require('../utils/dataStore');
const { getTournamentBySlug } = require('../utils/startgg');

// Path for storing season data
const SEASONS_PATH = path.join(__dirname, '../../data/seasons');
const CURRENT_SEASON_PATH = path.join(SEASONS_PATH, 'current.json');

module.exports = {
  name: 'season',
  description: 'View or modify the current SEMO smash season',
  async execute(message, args) {
    try {
      // Check if the user wants to modify the season (moderator only)
      if (args.length > 0) {
        // Check if user is a moderator
        if (!isModerator(message.member)) {
          return message.reply('You do not have permission to modify season data. This command is for moderators only.');
        }
        
        const action = args[0].toLowerCase();
        
        if (action === 'add' && args.length > 1) {
          const tournamentSlug = args[1].trim();
          let formattedSlug = tournamentSlug;
          
          // Format the slug properly if needed
          if (!formattedSlug.includes('/')) {
            formattedSlug = `tournament/${formattedSlug}`;
          }
          
          // Fetch tournament data to verify it exists
          const loadingMessage = await message.channel.send(`Fetching tournament data for ${tournamentSlug}...`);
          
          try {
            const tournamentData = await getTournamentBySlug(formattedSlug);
            
            if (!tournamentData) {
              return loadingMessage.edit(`Could not find tournament with slug: ${tournamentSlug}`);
            }
            
            // Let the user know matches are being imported
            await loadingMessage.edit(`✅ Added tournament "${tournamentData.name}" to the current season.\nImporting matches for season rankings...`);
            
            // Add tournament to season - this will trigger the match import
            const seasonManager = new (require('../ranking/seasonManager'))();
            await addTournamentToSeasonInDB(tournamentData);
            
            // Wait a moment for the import to process
            setTimeout(async () => {
              try {
                // Get the current season data to see if we have matches
                const seasonData = await seasonManager.loadCurrentSeason();
                const hasMatches = Object.keys(seasonData.playerRecords).length > 0;
                
                if (hasMatches) {
                  await loadingMessage.edit(`✅ Tournament "${tournamentData.name}" added to the current season.\nMatches have been imported for season rankings.\nUse \`!pr\` to see the updated power rankings.`);
                } else {
                  await loadingMessage.edit(`✅ Tournament "${tournamentData.name}" added to the current season.\nNo matches were imported. You may need to manually import them with \`!import-tournament-matches ${tournamentData.slug}\`.`);
                }
              } catch (error) {
                await loadingMessage.edit(`✅ Tournament "${tournamentData.name}" added to the current season.\nUse \`!pr\` to see the updated power rankings.`);
              }
            }, 3000);
          } catch (error) {
            console.error(`Error fetching tournament ${tournamentSlug}:`, error);
            return loadingMessage.edit(`Error: Could not fetch tournament data for "${tournamentSlug}".`);
          }
        } else if (action === 'remove' && args.length > 1) {
          const tournamentSlug = args[1].trim();
          
          try {
            // Remove tournament from season
            const { removedEvent } = await removeTournamentFromSeason(tournamentSlug);
            
            return message.reply(`✅ Removed tournament "${removedEvent.name}" from the current season.`);
          } catch (error) {
            return message.reply(error.message || `Error removing tournament: ${tournamentSlug}`);
          }
        } else if (action === 'create' && args.length > 1) {
          const seasonName = args.slice(1).join(' ');
          
          // Create new season
          const result = await createSeasonInDB(seasonName, `${seasonName} - SEMO Smash Season`);
          
          return message.reply(`✅ ${result}`);
        } else if (action === 'end') {
          // End the current season
          const seasonData = await endCurrentSeason();
          
          return message.reply(`✅ Ended current season "${seasonData.name}" as of today.`);
        } else {
          return message.reply('Usage:\n- `!season` - View the current season\n- `!season add [tournament-slug]` - Add a tournament to the season\n- `!season remove [tournament-slug]` - Remove a tournament from the season\n- `!season create [name]` - Create a new season\n- `!season end` - End the current season');
        }
      }
      
      // Just display season info - get all seasons to also show past seasons
      const seasons = await getAvailableSeasons();
      const currentSeason = seasons.find(s => s.isCurrent);
      
      if (!currentSeason) {
        return message.reply('No active season found. Use `!season create [name]` to create one.');
      }
      
      // Get more detailed data about the current season
      const seasonData = await fs.readFile(CURRENT_SEASON_PATH, 'utf8').then(JSON.parse);
      
      // Create an embed for the season info
      const embed = {
        color: 0x00AAFF,
        title: `🏆 ${currentSeason.name}`,
        description: seasonData.description || 'Current SEMO Smash Season',
        fields: [
          {
            name: '📅 Start Date',
            value: currentSeason.startDate || 'Not specified',
            inline: true
          },
          {
            name: '📅 End Date',
            value: currentSeason.endDate || 'Ongoing',
            inline: true
          }
        ],
        footer: {
          text: 'Use !pr to view the current power rankings'
        },
        timestamp: new Date()
      };
      
      // Add events if available
      if (seasonData.events && seasonData.events.length > 0) {
        const eventsField = {
          name: '🎮 Events',
          value: '',
          inline: false
        };
        
        // Sort events by date
        const sortedEvents = [...seasonData.events].sort((a, b) => a.startAt - b.startAt);
        
        for (const event of sortedEvents) {
          const date = new Date(event.startAt * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          eventsField.value += `• ${date}: [${event.name}](https://start.gg/${event.slug})\n`;
        }
        
        embed.fields.push(eventsField);
      } else {
        embed.fields.push({
          name: '🎮 Events',
          value: 'No events added to this season yet.',
          inline: false
        });
      }
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error handling season command:', error);
      message.reply('There was an error processing your request. Please try again later.');
    }
  }
};

// Create a new season
async function createSeason(name) {
  try {
    const seasons = await getData('seasons') || [];
    
    // Check if there's already an active season
    if (seasons.some(s => !s.endDate)) {
      return 'There is already an active season. End it first with !season end';
    }

    const newSeason = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      startDate: new Date().toISOString(),
      endDate: null,
      tournaments: [],  // Initialize empty tournaments array
      isCurrent: true
    };

    seasons.push(newSeason);
    await saveData('seasons', seasons);
    return `Created new season: ${name}`;
  } catch (error) {
    console.error('Error creating season:', error);
    return 'Error creating season';
  }
}

// Add a tournament to the current season
async function addTournamentToSeason(tournamentSlug) {
  try {
    const tournaments = await getData('tournaments') || [];
    const tournament = tournaments.find(t => t.slug === tournamentSlug);
    
    if (!tournament) {
      return 'Tournament not found. Import it first using the !bracket command';
    }

    const seasons = await getData('seasons') || [];
    const currentSeason = seasons.find(s => !s.endDate);
    
    if (!currentSeason) {
      return 'No active season found. Create one with !season create';
    }

    // Initialize tournaments array if it doesn't exist
    currentSeason.tournaments = currentSeason.tournaments || [];

    // Check if tournament is already in season
    if (currentSeason.tournaments.some(t => t.slug === tournamentSlug)) {
      return 'Tournament is already in the current season';
    }

    // Add tournament with full information
    currentSeason.tournaments.push({
      id: tournament.id,
      slug: tournamentSlug,
      name: tournament.name,
      date: tournament.startAt || new Date().toISOString()
    });

    await saveData('seasons', seasons);
    return `Added ${tournament.name} to ${currentSeason.name}`;
  } catch (error) {
    console.error('Error adding tournament to season:', error);
    return 'Error adding tournament to season';
  }
}
