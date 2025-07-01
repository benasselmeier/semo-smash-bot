const { isModerator } = require('../utils/permissions');
const { getTournamentParticipants, getTournamentParticipantsById } = require('../utils/startgg');
const { addOrUpdatePlayer } = require('../utils/dataStore');

module.exports = {
  name: 'import-players',
  description: 'Import players from a Start.gg tournament (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to import player data. This command is for moderators only.');
    }
    
    if (args.length < 1) {
      return message.reply('Usage:\n- By slug: `!import-players tournament/genesis-9`\n- By ID: `!import-players id:12345`');
    }
    
    try {
      // Parse tournament slug or ID
      const tournamentInput = args.join(' ');
      
      // Notify user we're fetching data
      let loadingMessage;
      let result;
      
      if (tournamentInput.startsWith('id:')) {
        // Process as tournament ID
        const tournamentId = tournamentInput.substring(3).trim();
        loadingMessage = await message.channel.send(`Fetching participants from tournament with ID: ${tournamentId}...`);
        
        try {
          result = await getTournamentParticipantsById(tournamentId);
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
        
        loadingMessage = await message.channel.send(`Fetching participants from tournament with slug: ${slug}...`);
        
        try {
          result = await getTournamentParticipants(slug);
        } catch (error) {
          return loadingMessage.edit(`Error: ${error.message}. Make sure the tournament slug is valid.`);
        }
      }
      
      const { tournament, participants } = result;
      
      if (!participants || participants.length === 0) {
        return loadingMessage.edit(`No participants found for tournament: ${tournament.name}`);
      }
      
      loadingMessage.edit(`Found ${participants.length} participants in "${tournament.name}". Importing...`);
      
      // Import players
      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const participant of participants) {
        try {
          // Check if player has a valid gamerTag
          if (!participant.gamerTag) {
            skippedCount++;
            continue;
          }
          
          // Prepare player data
          const playerData = {
            tag: participant.gamerTag,
            startggId: participant.id,
            source: 'startgg-import',
            // Set other fields if available
            avatarURL: participant.user?.images?.[0]?.url || null
          };
          
          // Import the player
          const result = await importPlayer(playerData);
          
          if (result === 'imported') {
            importedCount++;
          } else if (result === 'updated') {
            updatedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`Error importing player ${participant.gamerTag}:`, error);
          skippedCount++;
        }
      }
      
      // Send completion message
      const embed = {
        color: 0x00FF00,
        title: '✅ Player Import Complete',
        description: `Successfully processed players from "${tournament.name}"`,
        fields: [
          {
            name: 'Tournament',
            value: tournament.name,
            inline: true
          },
          {
            name: 'Total Players',
            value: participants.length.toString(),
            inline: true
          },
          {
            name: 'Results',
            value: `
            • New players added: **${importedCount}**
            • Existing players updated: **${updatedCount}**
            • Players skipped: **${skippedCount}**
            `,
            inline: false
          }
        ],
        footer: {
          text: 'Players are now available for match reporting. Note: Players are automatically imported when looking up tournaments.'
        },
        timestamp: new Date()
      };
      
      await loadingMessage.delete();
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in import-players command:', error);
      message.reply('There was an error accessing the Start.gg API. Make sure your API key is properly configured.');
    }
  }
};

/**
 * Import a player from Start.gg into the local database
 * @param {object} playerData - Player data from Start.gg
 * @returns {string} - Result of the import operation: 'imported', 'updated', or 'skipped'
 */
async function importPlayer(playerData) {
  try {
    // Check if we already have this player by Start.gg ID
    const { getPlayers } = require('../utils/dataStore');
    const { players } = await getPlayers();
    
    const existingPlayerByStartggId = players.find(p => p.startggId === playerData.startggId);
    const existingPlayerByTag = players.find(p => 
      p.tag.toLowerCase() === playerData.tag.toLowerCase() ||
      (p.aliases && p.aliases.some(alias => alias.toLowerCase() === playerData.tag.toLowerCase()))
    );
    
    if (existingPlayerByStartggId) {
      // Update existing player with startgg ID
      await addOrUpdatePlayer({
        ...existingPlayerByStartggId,
        ...playerData,
        lastImported: new Date().toISOString()
      });
      return 'updated';
    } else if (existingPlayerByTag) {
      // Update existing player found by tag
      await addOrUpdatePlayer({
        ...existingPlayerByTag,
        startggId: playerData.startggId,
        lastImported: new Date().toISOString()
      });
      return 'updated';
    } else {
      // Add new player
      await addOrUpdatePlayer({
        ...playerData,
        discordId: null, // Will be linked when they use !register
        createdAt: new Date().toISOString(),
        lastImported: new Date().toISOString(),
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        score: 1000 // Starting ELO score
      });
      return 'imported';
    }
  } catch (error) {
    console.error('Error in importPlayer:', error);
    return 'skipped';
  }
}
