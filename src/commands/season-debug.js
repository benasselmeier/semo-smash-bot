const { isModerator } = require('../utils/permissions');
const SeasonManager = require('../ranking/seasonManager');

module.exports = {
  name: 'season-debug',
  description: 'Debug information about the current season (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to access season debug information. This command is for moderators only.');
    }
    
    try {
      // Create a new season manager instance
      const seasonManager = new SeasonManager();
      
      // Load current season data
      const seasonData = await seasonManager.loadCurrentSeason();
      
      // Get statistics
      const numTournaments = seasonData.events.length;
      const numPlayers = Object.keys(seasonData.playerRecords).length;
      const numMatches = Object.values(seasonData.headToHeadRecords)
        .reduce((total, record) => total + record.matches.length, 0);
      
      // Create a detailed message
      let debugInfo = `**Season Debug: ${seasonData.name}**\n\n`;
      
      debugInfo += `**Overview:**\n`;
      debugInfo += `- Start Date: ${seasonData.startDate}\n`;
      debugInfo += `- End Date: ${seasonData.endDate || 'Ongoing'}\n`;
      debugInfo += `- Tournaments: ${numTournaments}\n`;
      debugInfo += `- Players: ${numPlayers}\n`;
      debugInfo += `- Matches: ${numMatches}\n\n`;
      
      if (numTournaments > 0) {
        debugInfo += `**Tournaments:**\n`;
        for (const event of seasonData.events) {
          debugInfo += `- ${event.name || 'Unnamed'} (${event.addedAt ? new Date(event.addedAt).toLocaleDateString() : 'No date'})\n`;
        }
        debugInfo += '\n';
      }
      
      if (numPlayers > 0) {
        debugInfo += `**Top Players:**\n`;
        const rankings = await seasonManager.getSeasonRankings();
        const topPlayers = rankings.slice(0, 5);
        
        for (const player of topPlayers) {
          debugInfo += `- ${player.tag}: ${player.wins}W/${player.losses}L (${player.winPercentage.toFixed(1)}%)\n`;
        }
      }
      
      // Split into multiple messages if too long
      if (debugInfo.length > 1900) {
        const parts = [];
        while (debugInfo.length > 0) {
          parts.push(debugInfo.slice(0, 1900));
          debugInfo = debugInfo.slice(1900);
        }
        
        for (const part of parts) {
          await message.channel.send(part);
        }
      } else {
        await message.channel.send(debugInfo);
      }
    } catch (error) {
      console.error('Error in season-debug command:', error);
      message.reply('There was an error retrieving season debug information.');
    }
  }
};
