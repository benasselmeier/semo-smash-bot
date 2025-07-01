const { getRankings, getPlayerByTag } = require('../utils/dataStore');

module.exports = {
  name: 'rank',
  description: 'View player rankings or a specific player\'s rank',
  async execute(message, args) {
    try {
      // If a player tag is provided, show that player's rank
      if (args.length > 0) {
        const playerTag = args.join(' ');
        const player = await getPlayerByTag(playerTag);
        
        if (!player) {
          return message.reply(`Player "${playerTag}" not found. Make sure the tag is spelled correctly.`);
        }
        
        const rankings = await getRankings();
        const playerRank = rankings.find(p => p.tag.toLowerCase() === player.tag.toLowerCase());
        
        if (!playerRank) {
          return message.reply(`Player "${player.tag}" hasn't played any ranked matches yet.`);
        }
        
        const winRate = player.matchesPlayed > 0 
          ? Math.round((player.wins / player.matchesPlayed) * 100) 
          : 0;
        
        const embed = {
          color: 0x00AAFF,
          title: `Rank #${playerRank.rank}: ${player.tag}`,
          thumbnail: {
            url: player.avatarURL || 'https://i.imgur.com/AfFp7pu.png', // Default image if no avatar
          },
          fields: [
            {
              name: 'ELO Score',
              value: `${player.score}`,
              inline: true,
            },
            {
              name: 'W/L Record',
              value: `${player.wins}W - ${player.losses}L`,
              inline: true,
            },
            {
              name: 'Win Rate',
              value: `${winRate}%`,
              inline: true,
            },
            {
              name: 'Matches Played',
              value: `${player.matchesPlayed}`,
              inline: true,
            }
          ],
          footer: {
            text: 'Smash Community Rankings'
          },
          timestamp: new Date()
        };
        
        return message.channel.send({ embeds: [embed] });
      }
      
      // Otherwise, show the top rankings
      const rankings = await getRankings();
      
      if (rankings.length === 0) {
        return message.reply('No rankings available yet. Play some matches to get on the leaderboard!');
      }
      
      // Get top 10 players or all if less than 10
      const topPlayers = rankings.slice(0, 10);
      
      const embed = {
        color: 0x00AAFF,
        title: '🏆 Smash Community Rankings 🏆',
        description: 'Current player rankings based on match results',
        fields: topPlayers.map(player => ({
          name: `#${player.rank}: ${player.tag}`,
          value: `ELO: ${player.score} | Record: ${player.wins}W-${player.losses}L`,
          inline: false
        })),
        footer: {
          text: 'Use !rank [player_tag] to see detailed stats for a specific player'
        },
        timestamp: new Date()
      };
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in rank command:', error);
      message.reply('There was an error fetching the rankings. Please try again later.');
    }
  }
};
