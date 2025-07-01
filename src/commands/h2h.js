const { getHeadToHead, getPlayerByTag } = require('../utils/dataStore');

module.exports = {
  name: 'h2h',
  description: 'View head-to-head record between two players',
  async execute(message, args) {
    if (args.length < 2) {
      return message.reply('Usage: !h2h [player1] [player2] - View the head-to-head record between two players');
    }
    
    const player1Tag = args[0];
    const player2Tag = args[1];
    
    // Verify players exist
    const player1 = await getPlayerByTag(player1Tag);
    const player2 = await getPlayerByTag(player2Tag);
    
    if (!player1) {
      return message.reply(`Player "${player1Tag}" not found. Check the spelling and try again.`);
    }
    
    if (!player2) {
      return message.reply(`Player "${player2Tag}" not found. Check the spelling and try again.`);
    }
    
    // Get head-to-head record
    const h2hRecord = await getHeadToHead(player1.tag, player2.tag);
    
    // Count wins for each player
    let player1Wins = 0;
    let player2Wins = 0;
    
    h2hRecord.matches.forEach(match => {
      if (match.winner === player1.tag) {
        player1Wins++;
      } else if (match.winner === player2.tag) {
        player2Wins++;
      }
    });
    
    // Create an embed for the record
    const embed = {
      color: 0x00AAFF,
      title: `🆚 Head-to-Head: ${player1.tag} vs. ${player2.tag}`,
      description: `Record in the current season`,
      fields: [
        {
          name: `${player1.tag}`,
          value: `${player1Wins} wins`,
          inline: true
        },
        {
          name: `${player2.tag}`,
          value: `${player2Wins} wins`,
          inline: true
        },
        {
          name: 'Total Matches',
          value: `${h2hRecord.matches.length}`,
          inline: true
        }
      ],
      footer: {
        text: 'Head-to-head record for current season'
      },
      timestamp: new Date()
    };
    
    // Add recent matches if available (up to 5)
    if (h2hRecord.matches.length > 0) {
      const recentMatches = h2hRecord.matches
        .slice(-5)
        .reverse() // Show most recent first
        .map(match => {
          const dateStr = new Date(match.date).toLocaleDateString();
          const scoreStr = match.score ? ` (${match.score})` : '';
          const tournamentStr = match.tournament ? ` at ${match.tournament}` : '';
          return `${match.winner} def. ${match.loser}${scoreStr}${tournamentStr} - ${dateStr}`;
        })
        .join('\n');
      
      embed.fields.push({
        name: 'Recent Matches',
        value: recentMatches || 'No matches recorded',
        inline: false
      });
    }
    
    return message.channel.send({ embeds: [embed] });
  }
};
