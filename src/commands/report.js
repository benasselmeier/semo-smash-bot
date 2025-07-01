const { isModerator } = require('../utils/permissions');
const { addMatch, getPlayerByTag, addOrUpdatePlayer } = require('../utils/dataStore');

module.exports = {
  name: 'report',
  description: 'Report a match result (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to report match results. This command is for moderators only.');
    }
    
    // Validate arguments
    if (args.length < 2) {
      return message.reply('Usage: !report "Winner Tag" "Loser Tag" [Score] [Tournament]\nExample: !report "JohnDoe" "JaneDoe" "3-2" "Weekly Tournament"');
    }
    
    try {
      // Parse input with regex to handle quotes
      const fullText = args.join(' ');
      const regex = /"([^"]*)"/g;
      const matches = [...fullText.matchAll(regex)];
      
      if (matches.length < 2) {
        return message.reply('Please provide winner and loser tags in quotes.\nExample: !report "JohnDoe" "JaneDoe" "3-2" "Weekly Tournament"');
      }
      
      const winnerTag = matches[0][1].trim();
      const loserTag = matches[1][1].trim();
      const score = matches.length > 2 ? matches[2][1].trim() : undefined;
      const tournament = matches.length > 3 ? matches[3][1].trim() : undefined;
      
      // Get or create players
      let winner = await getPlayerByTag(winnerTag);
      let loser = await getPlayerByTag(loserTag);
      
      if (!winner) {
        // Create new player
        await addOrUpdatePlayer({
          tag: winnerTag,
          discordId: null // Will be linked when they use !register
        });
        winner = await getPlayerByTag(winnerTag);
      }
      
      if (!loser) {
        // Create new player
        await addOrUpdatePlayer({
          tag: loserTag,
          discordId: null // Will be linked when they use !register
        });
        loser = await getPlayerByTag(loserTag);
      }
      
      // Create match record
      const matchData = {
        winner: winnerTag,
        loser: loserTag,
        score: score,
        tournament: tournament,
        reportedBy: message.author.id
      };
      
      await addMatch(matchData);
      
      // Confirmation message
      const resultText = score ? `${winnerTag} def. ${loserTag} (${score})` : `${winnerTag} def. ${loserTag}`;
      const tournamentText = tournament ? ` at ${tournament}` : '';
      
      const embed = {
        color: 0x00FF00,
        title: '✅ Match Result Reported',
        description: `${resultText}${tournamentText}`,
        fields: [
          {
            name: 'Reported By',
            value: message.author.tag,
            inline: true
          },
          {
            name: 'Time',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        footer: {
          text: 'Rankings have been updated'
        }
      };
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in report command:', error);
      message.reply('There was an error reporting the match. Please try again.');
    }
  }
};
