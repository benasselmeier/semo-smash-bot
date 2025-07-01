const { isModerator } = require('../utils/permissions');
const { 
  getRankingSystemInfo, 
  setRankingSystem, 
  getRankings
} = require('../utils/dataStore');

module.exports = {
  name: 'ranking-system',
  description: 'View or change the current ranking system (moderators only)',
  async execute(message, args) {
    // Get current ranking system info
    const rankingInfo = getRankingSystemInfo();
    
    // If no arguments, just show current system
    if (args.length === 0) {
      return message.reply(`Current ranking system: **${rankingInfo.name}**\nAvailable systems: ${rankingInfo.availableSystems.join(', ')}`);
    }
    
    // Check if user is a moderator for changing the system
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to change the ranking system. This command is for moderators only.');
    }
    
    const newSystem = args[0].toLowerCase();
    
    // Check if the requested system is valid
    if (!rankingInfo.availableSystems.includes(newSystem)) {
      return message.reply(`Invalid ranking system. Available systems are: ${rankingInfo.availableSystems.join(', ')}`);
    }
    
    // Change the ranking system
    const success = await setRankingSystem(newSystem);
    
    if (!success) {
      return message.reply(`Failed to set ranking system to "${newSystem}". Please try again later.`);
    }
    
    // Get updated info
    const updatedInfo = getRankingSystemInfo();
    
    // Get current rankings with the new system
    const rankings = await getRankings();
    const topPlayer = rankings.length > 0 ? rankings[0] : null;
    
    // Create an embed with system info
    const embed = {
      color: 0x00AAFF,
      title: `🔄 Ranking System Changed`,
      description: `The ranking system has been changed to **${updatedInfo.name}**`,
      fields: [
        {
          name: 'Previous System',
          value: rankingInfo.name,
          inline: true
        },
        {
          name: 'New System',
          value: updatedInfo.name,
          inline: true
        }
      ],
      footer: {
        text: 'Player rankings have been recalculated'
      },
      timestamp: new Date()
    };
    
    // Add current #1 player info if available
    if (topPlayer) {
      embed.fields.push({
        name: 'Current #1 Player',
        value: `${topPlayer.tag} - Rating: ${topPlayer.displayRating || topPlayer.score}`,
        inline: false
      });
    }
    
    return message.channel.send({ embeds: [embed] });
  }
};
