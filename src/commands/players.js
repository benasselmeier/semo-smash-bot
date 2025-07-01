const { getPlayers } = require('../utils/dataStore');

module.exports = {
  name: 'players',
  description: 'List all players or search for specific players',
  async execute(message, args) {
    try {
      const { players } = await getPlayers();
      
      // If no arguments provided, list all players (paginated)
      if (args.length === 0) {
        if (players.length === 0) {
          return message.reply('No players have been registered yet.');
        }
        
        // Sort players alphabetically by tag
        const sortedPlayers = [...players].sort((a, b) => 
          a.tag.toLowerCase().localeCompare(b.tag.toLowerCase())
        );
        
        // Prepare for pagination (10 players per page)
        const playersPerPage = 10;
        const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);
        const page = 1; // Start with page 1
        
        // Create embed for current page
        const embed = createPlayersEmbed(sortedPlayers, page, playersPerPage, totalPages);
        
        message.channel.send({ embeds: [embed] });
      } else {
        // Search for players matching the search term
        const searchTerm = args.join(' ').toLowerCase();
        const matchingPlayers = players.filter(player => 
          player.tag.toLowerCase().includes(searchTerm) || 
          (player.characters && player.characters.some(char => char.toLowerCase().includes(searchTerm)))
        );
        
        if (matchingPlayers.length === 0) {
          return message.reply(`No players found matching "${args.join(' ')}".`);
        }
        
        // Sort matching players alphabetically
        const sortedPlayers = [...matchingPlayers].sort((a, b) => 
          a.tag.toLowerCase().localeCompare(b.tag.toLowerCase())
        );
        
        // Create embed for search results
        const embed = {
          color: 0x00AAFF,
          title: `🔍 Player Search Results: "${args.join(' ')}"`,
          description: `Found ${sortedPlayers.length} matching players:`,
          fields: sortedPlayers.slice(0, 15).map(player => {
            // Format player information
            const characters = player.characters && player.characters.length > 0
              ? `\nCharacters: ${player.characters.join(', ')}`
              : '';
            
            const matchRecord = player.matchesPlayed > 0
              ? `\nRecord: ${player.wins}W-${player.losses}L (${player.matchesPlayed} matches)`
              : '\nNo matches played yet';
            
            const rankInfo = player.score
              ? `\nELO: ${player.score}`
              : '';
            
            return {
              name: player.tag,
              value: `${characters}${matchRecord}${rankInfo}`,
              inline: false
            };
          }),
          footer: {
            text: sortedPlayers.length > 15 
              ? `Showing 15 of ${sortedPlayers.length} results. Use more specific search terms to narrow down.`
              : 'Use !register to add yourself as a player'
          },
          timestamp: new Date()
        };
        
        message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error in players command:', error);
      message.reply('There was an error retrieving the player list. Please try again later.');
    }
  }
};

/**
 * Create an embed for displaying a page of players
 * @param {Array} players - Array of player objects
 * @param {number} page - Current page number
 * @param {number} playersPerPage - Number of players per page
 * @param {number} totalPages - Total number of pages
 * @returns {object} - Embed object
 */
function createPlayersEmbed(players, page, playersPerPage, totalPages) {
  const startIndex = (page - 1) * playersPerPage;
  const endIndex = Math.min(startIndex + playersPerPage, players.length);
  const pagePlayers = players.slice(startIndex, endIndex);
  
  return {
    color: 0x00AAFF,
    title: '👥 Player List',
    description: `Showing players ${startIndex + 1}-${endIndex} of ${players.length}`,
    fields: pagePlayers.map(player => {
      // Format player information
      const characters = player.characters && player.characters.length > 0
        ? `\nCharacters: ${player.characters.join(', ')}`
        : '';
      
      const matchRecord = player.matchesPlayed > 0
        ? `\nRecord: ${player.wins}W-${player.losses}L (${player.matchesPlayed} matches)`
        : '\nNo matches played yet';
      
      const rankInfo = player.score
        ? `\nELO: ${player.score}`
        : '';
      
      return {
        name: player.tag,
        value: `${characters}${matchRecord}${rankInfo}`,
        inline: false
      };
    }),
    footer: {
      text: `Page ${page}/${totalPages} • Use !players [search term] to search for specific players`
    },
    timestamp: new Date()
  };
}
