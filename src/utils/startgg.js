const config = require('../../config');

// Start.gg API endpoint
const STARTGG_API_ENDPOINT = 'https://api.start.gg/gql/alpha';

/**
 * Make a request to the Start.gg GraphQL API
 * @param {string} query - GraphQL query string
 * @param {object} variables - Variables for the query
 * @returns {Promise<object>} - API response
 */
async function queryStartGG(query, variables = {}) {
  try {
    if (!config.startggApiKey || config.startggApiKey === 'your_startgg_api_key_here') {
      throw new Error('Start.gg API key is not configured. Please add it to your .env file.');
    }

    // Dynamically import graphql-request
    const { request, gql } = await import('graphql-request');

    const headers = {
      Authorization: `Bearer ${config.startggApiKey}`,
    };

    const response = await request(STARTGG_API_ENDPOINT, query, variables, headers);
    return response;
  } catch (error) {
    console.error('Error querying Start.gg API:', error.message);
    throw error;
  }
}

/**
 * Get tournament information by slug
 * @param {string} slug - Tournament slug (e.g., "tournament/example-tournament")
 * @returns {Promise<object>} - Tournament data
 */
async function getTournamentBySlug(slug) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query TournamentQuery($slug: String) {
      tournament(slug: $slug) {
        id
        name
        slug
        startAt
        endAt
        numAttendees
        events {
          id
          name
          numEntrants
          type
          videogame {
            id
            name
          }
          standings(query: { page: 1, perPage: 8 }) {
            nodes {
              placement
              entrant {
                id
                name
                participants {
                  player {
                    id
                    gamerTag
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  return queryStartGG(query, { slug });
}

/**
 * Get tournament information by ID
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<object>} - Tournament data
 */
async function getTournamentById(tournamentId) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query TournamentById($tournamentId: ID!) {
      tournament(id: $tournamentId) {
        id
        name
        slug
        startAt
        endAt
        numAttendees
        events {
          id
          name
          numEntrants
          type
          videogame {
            id
            name
          }
        }
      }
    }
  `;

  return queryStartGG(query, { tournamentId });
}

/**
 * Get participants from a tournament by slug
 * @param {string} slug - Tournament slug
 * @returns {Promise<Array>} - Array of participants data
 */
async function getTournamentParticipants(slug) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query TournamentParticipants($slug: String!, $page: Int!, $perPage: Int!) {
      tournament(slug: $slug) {
        id
        name
        participants(query: {
          page: $page
          perPage: $perPage
        }) {
          pageInfo {
            total
            totalPages
          }
          nodes {
            id
            gamerTag
            user {
              id
              slug
              discriminator
              images {
                url
              }
            }
            entrants {
              id
              event {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  // Fetch first page to get total pages
  const firstPageResult = await queryStartGG(query, { 
    slug,
    page: 1,
    perPage: 50 
  });

  if (!firstPageResult.tournament) {
    throw new Error('Tournament not found');
  }

  const totalPages = firstPageResult.tournament.participants.pageInfo.totalPages;
  let allParticipants = [...firstPageResult.tournament.participants.nodes];
  
  // Fetch remaining pages if needed
  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const pageResult = await queryStartGG(query, { 
        slug,
        page,
        perPage: 50 
      });
      
      allParticipants = [
        ...allParticipants, 
        ...pageResult.tournament.participants.nodes
      ];
    }
  }
  
  return {
    tournament: {
      id: firstPageResult.tournament.id,
      name: firstPageResult.tournament.name
    },
    participants: allParticipants
  };
}

/**
 * Get participants from a tournament by ID
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Array>} - Array of participants data
 */
async function getTournamentParticipantsById(tournamentId) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query TournamentParticipantsById($tournamentId: ID!, $page: Int!, $perPage: Int!) {
      tournament(id: $tournamentId) {
        id
        name
        participants(query: {
          page: $page
          perPage: $perPage
        }) {
          pageInfo {
            total
            totalPages
          }
          nodes {
            id
            gamerTag
            user {
              id
              slug
              discriminator
              images {
                url
              }
            }
            entrants {
              id
              event {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  // Fetch first page to get total pages
  const firstPageResult = await queryStartGG(query, { 
    tournamentId,
    page: 1,
    perPage: 50 
  });

  if (!firstPageResult.tournament) {
    throw new Error('Tournament not found');
  }

  const totalPages = firstPageResult.tournament.participants.pageInfo.totalPages;
  let allParticipants = [...firstPageResult.tournament.participants.nodes];
  
  // Fetch remaining pages if needed
  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page++) {
      const pageResult = await queryStartGG(query, { 
        tournamentId,
        page,
        perPage: 50 
      });
      
      allParticipants = [
        ...allParticipants, 
        ...pageResult.tournament.participants.nodes
      ];
    }
  }
  
  return {
    tournament: {
      id: firstPageResult.tournament.id,
      name: firstPageResult.tournament.name
    },
    participants: allParticipants
  };
}

/**
 * Get player information by gamer tag
 * @param {string} gamerTag - Player's gamer tag
 * @returns {Promise<object>} - Player data
 */
async function getPlayerByGamerTag(gamerTag) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query PlayerQuery($gamerTag: String) {
      player(gamerTag: $gamerTag) {
        id
        gamerTag
        user {
          id
          slug
          bio
          images {
            url
          }
        }
        rankings {
          rank
          title
        }
        recentStandings(videogameId: 1, limit: 5) {
          placement
          entrant {
            name
          }
          tournament {
            id
            name
            slug
          }
        }
      }
    }
  `;

  return queryStartGG(query, { gamerTag });
}

/**
 * Get recent tournaments for a specific game
 * @param {number} perPage - Number of tournaments to fetch
 * @param {number} videogameId - ID of the game (default: 1 for Super Smash Bros. Melee)
 * @returns {Promise<object} - Recent tournaments data
 */
async function getRecentTournaments(perPage = 5, videogameId = 1) {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  
  const query = gql`
    query TournamentsQuery($perPage: Int, $videogameId: ID) {
      tournaments(query: {
        perPage: $perPage,
        filter: {
          videogameIds: [$videogameId],
          upcoming: true
        },
        sort: startAt_ASC
      }) {
        nodes {
          id
          name
          slug
          startAt
          endAt
          numAttendees
          images {
            url
          }
        }
      }
    }
  `;

  return queryStartGG(query, { perPage, videogameId });
}

/**
 * Automatically import participants from a tournament
 * @param {string} tournamentSlugOrId - Tournament slug or ID (with 'id:' prefix)
 * @param {boolean} silent - Whether to run silently (no return value) or return import stats
 * @returns {Promise<object|void>} - Import stats if silent=false, void otherwise
 */
// Keep track of recent imports to prevent duplicates
const recentImports = new Map();

async function autoImportParticipants(tournamentSlugOrId, silent = false) {
  try {
    // Check if this tournament was recently imported (within last 60 seconds)
    const now = Date.now();
    if (recentImports.has(tournamentSlugOrId)) {
      const lastImport = recentImports.get(tournamentSlugOrId);
      if (now - lastImport < 60000) { // 60 seconds
        console.log(`Skipping duplicate import for ${tournamentSlugOrId} (imported ${Math.floor((now - lastImport)/1000)}s ago)`);
        if (!silent) {
          return { skipped: true, reason: 'Recently imported' };
        }
        return;
      }
    }
    
    // Record this import
    recentImports.set(tournamentSlugOrId, now);
    
    // Clean up old entries (keep map from growing indefinitely)
    if (recentImports.size > 50) {
      const entriesToDelete = [];
      for (const [key, timestamp] of recentImports.entries()) {
        if (now - timestamp > 3600000) { // 1 hour
          entriesToDelete.push(key);
        }
      }
      entriesToDelete.forEach(key => recentImports.delete(key));
    }
    const { addOrUpdatePlayer } = require('./dataStore');
    let result;
    
    if (tournamentSlugOrId.startsWith('id:')) {
      // Process as tournament ID
      const tournamentId = tournamentSlugOrId.substring(3).trim();
      result = await getTournamentParticipantsById(tournamentId);
    } else {
      // Process as tournament slug
      result = await getTournamentParticipants(tournamentSlugOrId);
    }
    
    const { tournament, participants } = result;
    
    if (!participants || participants.length === 0) {
      if (!silent) return { tournament, imported: 0, updated: 0, skipped: 0, total: 0 };
      return;
    }
    
    // Import stats
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Get existing players to check for duplicates
    const { getPlayers } = require('./dataStore');
    const { players } = await getPlayers();
    
    for (const participant of participants) {
      try {
        // Skip if no gamerTag
        if (!participant.gamerTag) {
          skippedCount++;
          continue;
        }
        
        // Prepare player data
        const playerData = {
          tag: participant.gamerTag,
          startggId: participant.id,
          source: 'auto-import',
          avatarURL: participant.user?.images?.[0]?.url || null,
          lastImported: new Date().toISOString()
        };
        
        // Check if player exists
        const existingByStartggId = players.find(p => p.startggId === playerData.startggId);
        const existingByTag = players.find(p => 
          p.tag.toLowerCase() === playerData.tag.toLowerCase() ||
          (p.aliases && p.aliases.some(alias => alias.toLowerCase() === playerData.tag.toLowerCase()))
        );
        
        if (existingByStartggId) {
          // Update existing player
          await addOrUpdatePlayer({
            ...existingByStartggId,
            ...playerData
          });
          updatedCount++;
        } else if (existingByTag) {
          // Update existing player with new startgg ID
          await addOrUpdatePlayer({
            ...existingByTag,
            startggId: playerData.startggId,
            lastImported: new Date().toISOString()
          });
          updatedCount++;
        } else {
          // Add new player
          await addOrUpdatePlayer({
            ...playerData,
            discordId: null,
            createdAt: new Date().toISOString(),
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            score: 1000 // Starting ELO
          });
          importedCount++;
        }
      } catch (error) {
        console.error(`Error auto-importing player ${participant.gamerTag}:`, error);
        skippedCount++;
      }
    }
    
    if (!silent) {
      return {
        tournament,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: participants.length
      };
    }
  } catch (error) {
    console.error('Error in autoImportParticipants:', error);
    if (!silent) {
      return { error: error.message };
    }
  }
}

module.exports = {
  getTournamentBySlug,
  getTournamentById,
  getPlayerByGamerTag,
  getRecentTournaments,
  getTournamentParticipants,
  getTournamentParticipantsById,
  autoImportParticipants,
  queryStartGG
};
