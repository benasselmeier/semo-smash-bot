const { getPlayerByTag } = require('../utils/dataStore');

module.exports = {
  name: 'smasher',
  description: 'Look up a Smash player by tag',
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: `!smasher [player-tag]`\nExample: `!smasher juno`');
    }
    
    try {
      // Get the player tag from args
      const playerTag = args.join(' ').trim();
      
      // Look up the player
      const player = await getPlayerByTag(playerTag);
      
      if (!player) {
        return message.reply(`Could not find player with tag matching "${playerTag}". Please check the spelling or try another tag.`);
      }
      
      // Calculate win rate
      const winRate = player.matchesPlayed > 0 
        ? ((player.wins / player.matchesPlayed) * 100).toFixed(1) 
        : 'N/A';
      
      // Create an embed for the player info
      const embed = {
        color: 0x00AAFF,
        title: `Player Profile: ${player.tag}`,
        thumbnail: player.avatarURL ? { url: player.avatarURL } : null,
        fields: [
          {
            name: '🏆 Ranking',
            value: player.score ? player.score.toString() : 'Unranked',
            inline: true
          },
          {
            name: '🎮 Main Characters',
            value: player.characters?.length > 0 ? player.characters.join(', ') : 'Not specified',
            inline: true
          },
          {
            name: '📊 Stats',
            value: `Matches: ${player.matchesPlayed || 0}\nWins: ${player.wins || 0}\nLosses: ${player.losses || 0}\nWin Rate: ${winRate}%`,
            inline: false
          }
        ],
        footer: {
          text: player.discordId ? 'Discord account linked' : 'No Discord account linked'
        },
        timestamp: new Date()
      };
      
      // Add start.gg info if available
      if (player.startggId) {
        embed.fields.push({
          name: '🌐 Start.gg',
          value: `[View Profile](https://start.gg/user/${player.startggId})`,
          inline: true
        });
      }
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error looking up player:', error);
      message.reply('There was an error looking up this player. Please try again later.');
    }
  }
};
