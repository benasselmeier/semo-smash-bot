const { getMatches, getPlayerByTag } = require('../utils/dataStore');

module.exports = {
  name: 'matches',
  description: 'View recent matches, optionally filtered by player',
  async execute(message, args) {
    try {
      const { matches } = await getMatches();
      
      // If a player tag is provided, filter matches for that player
      if (args.length > 0) {
        const playerTag = args.join(' ');
        const player = await getPlayerByTag(playerTag);
        
        if (!player) {
          return message.reply(`Player "${playerTag}" not found. Make sure the tag is spelled correctly.`);
        }
        
        const playerMatches = matches.filter(match => 
          match.winner.toLowerCase() === player.tag.toLowerCase() ||
          match.loser.toLowerCase() === player.tag.toLowerCase()
        );
        
        if (playerMatches.length === 0) {
          return message.reply(`No matches found for player "${player.tag}".`);
        }
        
        // Sort by most recent first
        const recentMatches = playerMatches
          .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))
          .slice(0, 10); // Get most recent 10 matches
        
        const embed = {
          color: 0x00AAFF,
          title: `Recent Matches for ${player.tag}`,
          description: 'Most recent matches:',
          fields: recentMatches.map(match => {
            const matchResult = match.score 
              ? `${match.winner} def. ${match.loser} (${match.score})` 
              : `${match.winner} def. ${match.loser}`;
            const tournamentText = match.tournament ? `at ${match.tournament}` : '';
            const date = new Date(match.reportedAt).toLocaleDateString();
            
            return {
              name: `${date}`,
              value: `${matchResult} ${tournamentText}`,
              inline: false
            };
          }),
          footer: {
            text: `Total matches: ${playerMatches.length}`
          },
          timestamp: new Date()
        };
        
        return message.channel.send({ embeds: [embed] });
      }
      
      // If no player specified, show recent matches
      if (matches.length === 0) {
        return message.reply('No matches have been reported yet.');
      }
      
      // Get 10 most recent matches
      const recentMatches = [...matches]
        .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt))
        .slice(0, 10);
      
      const embed = {
        color: 0x00AAFF,
        title: '🎮 Recent Matches',
        description: 'Most recently reported matches:',
        fields: recentMatches.map(match => {
          const matchResult = match.score 
            ? `${match.winner} def. ${match.loser} (${match.score})` 
            : `${match.winner} def. ${match.loser}`;
          const tournamentText = match.tournament ? `at ${match.tournament}` : '';
          const date = new Date(match.reportedAt).toLocaleDateString();
          
          return {
            name: `${date}`,
            value: `${matchResult} ${tournamentText}`,
            inline: false
          };
        }),
        footer: {
          text: `Use !matches [player_tag] to filter by player • Total matches: ${matches.length}`
        },
        timestamp: new Date()
      };
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in matches command:', error);
      message.reply('There was an error fetching the matches. Please try again later.');
    }
  }
};
