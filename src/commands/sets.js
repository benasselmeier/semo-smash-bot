const { getData } = require('../utils/dataStore');
const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'sets',
  description: 'View sets stored in the database, optionally filtered by player or tournament',
  async execute(message, args) {
    try {
      // Get matches data
      const matchesData = await getData('matches');
      console.log('Raw matches data:', JSON.stringify(matchesData, null, 2));
      
      // Handle various possible data structures
      let matches = [];
      if (Array.isArray(matchesData)) {
        matches = matchesData;
      } else if (matchesData && matchesData.matches) {
        matches = Array.isArray(matchesData.matches) ? matchesData.matches : [];
      }

      if (matches.length === 0) {
        return message.reply('No sets found in the database.');
      }

      // Parse arguments for filtering
      let filterType = null;
      let filterValue = null;
      if (args.length >= 2) {
        filterType = args[0].toLowerCase();
        filterValue = args.slice(1).join(' ').toLowerCase();
      }

      // Filter matches based on arguments
      let filteredMatches = matches;
      if (filterType && filterValue) {
        switch (filterType) {
          case 'player':
            filteredMatches = matches.filter(m => 
              m.winner.toLowerCase().includes(filterValue) || 
              m.loser.toLowerCase().includes(filterValue)
            );
            break;
          case 'tournament':
            filteredMatches = matches.filter(m => 
              m.tournament.toLowerCase().includes(filterValue)
            );
            break;
          default:
            return message.reply('Invalid filter type. Use `player` or `tournament`.');
        }
      }

      // Sort matches by date, most recent first
      filteredMatches.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

      // Take only the most recent 10 matches
      const recentMatches = filteredMatches.slice(0, 10);

      // Create embed
      const embed = {
        color: 0x00AAFF,
        title: 'Stored Tournament Sets',
        description: `Showing ${Math.min(10, filteredMatches.length)} of ${filteredMatches.length} sets${
          filterType ? ` filtered by ${filterType}: ${filterValue}` : ''
        }`,
        fields: [],
        footer: {
          text: `Use !sets player <name> or !sets tournament <name> to filter`
        }
      };

      // Add matches to embed
      for (const match of recentMatches) {
        const characterInfo = Object.entries(match.characters || {})
          .map(([player, chars]) => `${player}: ${chars.join(', ')}`)
          .join('\n');

        embed.fields.push({
          name: `${match.winner} vs ${match.loser}`,
          value: [
            `🏆 **Winner:** ${match.winner}`,
            `📊 **Score:** ${match.score}`,
            `🏟️ **Tournament:** ${match.tournament}`,
            `🎮 **Event:** ${match.eventName || 'Unknown'}`,
            `🔄 **Round:** ${match.round || 'Unknown'}`,
            characterInfo ? `👾 **Characters:**\n${characterInfo}` : '',
            `⏰ **Date:** ${new Date(match.reportedAt).toLocaleDateString()}`,
            `🆔 **Set ID:** ${match.setId}`
          ].filter(Boolean).join('\n'),
          inline: false
        });
      }

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in sets command:', error);
      return message.reply('There was an error retrieving the sets.');
    }
  }
};
