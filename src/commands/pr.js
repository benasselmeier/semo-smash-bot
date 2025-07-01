const { 
  getRankings,
  getSeasonRankings,
  getAvailableSeasons,
  getRankingSystemInfo
} = require('../utils/dataStore');
const fs = require('fs').promises;
const path = require('path');

// Path for storing season PR data
const SEASONS_PATH = path.join(__dirname, '../../data/seasons');

module.exports = {
  name: 'pr',
  description: 'Show power rankings for the community',
  async execute(message, args) {
    try {
      // Get ranking system info
      const rankingSystem = getRankingSystemInfo();
      
      // Check if a specific season was requested
      const seasonId = args.length > 0 ? args[0].toLowerCase() : 'current';
      
      // Get available seasons for display
      const seasons = await getAvailableSeasons();
      
      // Try to load a specific season if requested
      if (seasonId !== 'current') {
        const matchingSeason = seasons.find(s => s.id === seasonId);
        
        if (!matchingSeason) {
          const seasonsList = seasons.map(s => `• ${s.id} - ${s.name} (${s.isCurrent ? 'Current' : s.endDate})`).join('\n');
          return message.reply(`Season "${seasonId}" not found. Available seasons:\n${seasonsList}`);
        }
        
        try {
          // Get rankings for the requested season
          const rankings = await getSeasonRankings(seasonId);
          
          if (!rankings || rankings.length === 0) {
            return message.reply(`No player rankings found for season "${matchingSeason.name}".`);
          }
          
          // Load the season data to get tournament count
          const seasonData = await fs.readFile(path.join(SEASONS_PATH, `${seasonId}.json`), 'utf8')
            .then(data => JSON.parse(data))
            .catch(() => null);
          
          // Create an embed for the season PR
          const embed = {
            color: 0xFFD700, // Gold
            title: `🏆 Power Rankings: ${matchingSeason.name}`,
            description: `Season power rankings (${matchingSeason.startDate} - ${matchingSeason.endDate || 'Ongoing'})`,
            fields: [],
            footer: {
              text: seasonData && seasonData.events && seasonData.events.length > 0
                ? `Includes ${seasonData.events.length} tournament(s) · Based on ${rankings[0].winPercentage ? 'win percentage and strength of schedule' : rankingSystem.name}`
                : `Based on ${rankings[0].winPercentage ? 'win percentage and strength of schedule' : rankingSystem.name}`
            },
            timestamp: new Date()
          };
          
          // Add players to the embed
          for (let i = 0; i < Math.min(rankings.length, 10); i++) {
            const player = rankings[i];
            embed.fields.push({
              name: `#${i + 1}: ${player.tag}`,
              value: player.winPercentage
                ? `Win rate: ${player.winPercentage.toFixed(1)}%\nW/L: ${player.wins}/${player.losses}`
                : `Rating: ${player.displayRating || player.score}\nW/L: ${player.wins}/${player.losses}`,
              inline: true
            });
          }
          
          return message.channel.send({ embeds: [embed] });
        } catch (error) {
          console.error(`Error loading season ${seasonId}:`, error);
          return message.reply(`Error loading season "${seasonId}". Using current rankings instead.`);
        }
      }
      
      // Get the current season first
      const currentSeason = seasons.find(s => s.isCurrent);
      
      // Check if there are season rankings available first (preferred)
      const seasonRankings = await getSeasonRankings('current');
      
      // If we have season rankings, use those
      if (seasonRankings && seasonRankings.length > 0) {
        // Create an embed for the PR using season rankings
        const seasonEmbed = {
          color: 0xFFD700, // Gold
          title: '🏆 Current Season Rankings',
          description: currentSeason 
            ? `${currentSeason.name} (${currentSeason.startDate} to ${currentSeason.endDate || 'present'})`
            : 'Current Season Rankings',
          fields: [],
          footer: {
            text: currentSeason && currentSeason.tournaments && currentSeason.tournaments.length > 0
              ? `Includes ${currentSeason.tournaments.length} tournament(s) · Based on win percentage and strength of schedule`
              : 'Based on win percentage and strength of schedule'
          },
          timestamp: new Date()
        };
        
        // Add the top players to the embed
        const topPlayers = seasonRankings.slice(0, 10);
        for (let i = 0; i < topPlayers.length; i++) {
          const player = topPlayers[i];
          seasonEmbed.fields.push({
            name: `#${i + 1}: ${player.tag}`,
            value: `Win rate: ${player.winPercentage.toFixed(1)}%\nW/L: ${player.wins}/${player.losses}`,
            inline: true
          });
        }
        
        return message.channel.send({ embeds: [seasonEmbed] });
      }
      
      // Fall back to regular rankings if no season rankings
      const rankings = await getRankings();
      
      if (!rankings || rankings.length === 0) {
        // Check if season even has tournaments
        if (currentSeason && currentSeason.events && currentSeason.events.length > 0) {
          return message.reply('No rankings available yet. The current season has tournaments but no matches have been recorded. Try running `!import-tournament-matches tournament-slug` to import matches from one of the tournaments.');
        } else {
          return message.reply('No rankings available yet. Play some matches or add a tournament to the current season with `!season add tournament-slug`.');
        }
      }
      
      // Create an embed for the PR
      const embed = {
        color: 0xFFD700, // Gold
        title: '🏆 Current Power Rankings',
        description: currentSeason 
          ? `Top players in ${currentSeason.name}`
          : 'Top players in the community',
        fields: [],
        footer: {
          text: currentSeason && currentSeason.events.length > 0
            ? `Rankings include tournament matches from ${currentSeason.events.length} event(s)`
            : `Rankings based on ${rankingSystem.name}`
        },
        timestamp: new Date()
      };
      
      // Add the top players to the embed
      const topPlayers = rankings.slice(0, 10);
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        embed.fields.push({
          name: `#${i + 1}: ${player.tag}`,
          value: player.winPercentage !== undefined
            ? `Win rate: ${player.winPercentage.toFixed(1)}%\nW/L: ${player.wins}/${player.losses}`
            : `Rating: ${player.displayRating || player.score}\nW/L: ${player.wins}/${player.losses}`,
          inline: true
        });
      }
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching rankings:', error);
      message.reply('There was an error fetching the rankings. Please try again later.');
    }
  }
};
