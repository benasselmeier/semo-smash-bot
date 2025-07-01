const { getPlayers } = require('../utils/dataStore');

module.exports = {
  name: 'auto-import-info',
  description: 'Information about the auto-import player system',
  async execute(message, args) {
    try {
      const { players } = await getPlayers();
      
      // Get stats about auto-imported players
      const totalPlayers = players.length;
      const autoImportedPlayers = players.filter(p => p.source === 'auto-import' || p.source === 'startgg-import').length;
      const linkedPlayers = players.filter(p => p.discordId && (p.source === 'auto-import' || p.source === 'startgg-import')).length;
      const unlinkedPlayers = autoImportedPlayers - linkedPlayers;
      
      // Get recent auto-imports (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentImports = players.filter(p => 
        p.lastImported && new Date(p.lastImported) > sevenDaysAgo
      ).length;
      
      const embed = {
        color: 0x3498DB,
        title: '🤖 Auto-Import System Information',
        description: 'The bot automatically imports player data from Start.gg tournaments when you look them up.',
        fields: [
          {
            name: 'Total Players',
            value: totalPlayers.toString(),
            inline: true
          },
          {
            name: 'Auto-Imported Players',
            value: autoImportedPlayers.toString(),
            inline: true
          },
          {
            name: 'Recent Imports (7 days)',
            value: recentImports.toString(),
            inline: true
          },
          {
            name: 'Players Linked to Discord',
            value: linkedPlayers.toString(),
            inline: true
          },
          {
            name: 'Players Not Linked',
            value: unlinkedPlayers.toString(),
            inline: true
          },
          {
            name: 'How It Works',
            value: `
• Players are automatically imported when you lookup tournaments
• When players register with \`!register\`, they are linked to their tournament data
• All match history and tournament stats are preserved when linking accounts
            `,
            inline: false
          }
        ],
        footer: {
          text: 'Use !register to link your Discord account with your tournament data'
        },
        timestamp: new Date()
      };
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in auto-import-info command:', error);
      message.reply('There was an error retrieving auto-import information. Please try again later.');
    }
  }
};
