const fs = require('fs').promises;
const path = require('path');

// Path for storing season data
const SEASONS_PATH = path.join(__dirname, '../../data/seasons');
const CURRENT_SEASON_PATH = path.join(SEASONS_PATH, 'current.json');

/**
 * Manages season data, including tournaments, player records, and rankings
 */
class SeasonManager {
  constructor() {
    this.initializeSeasonData();
  }
  
  /**
   * Initialize season data directory if it doesn't exist
   */
  async initializeSeasonData() {
    try {
      await fs.mkdir(SEASONS_PATH, { recursive: true });
      
      try {
        await fs.access(CURRENT_SEASON_PATH);
        // File exists, no need to create it
      } catch (error) {
        // File doesn't exist, create default season data
        const defaultSeason = {
          name: 'SEMO Smash Season 1',
          description: 'The first official SEMO Smash season',
          startDate: new Date().toISOString().split('T')[0],
          endDate: null,
          events: [],
          playerRecords: {}, // Player records within this season
          headToHeadRecords: {}, // Head-to-head records between players
          rankings: [] // Snapshot of rankings at end of season
        };
        
        await fs.writeFile(CURRENT_SEASON_PATH, JSON.stringify(defaultSeason, null, 2));
      }
    } catch (error) {
      console.error('Error initializing season data:', error);
    }
  }
  
  /**
   * Load the current season data
   * @returns {Object} Current season data
   */
  async loadCurrentSeason() {
    await this.initializeSeasonData();
    const data = await fs.readFile(CURRENT_SEASON_PATH, 'utf8');
    return JSON.parse(data);
  }
  
  /**
   * Save the current season data
   * @param {Object} seasonData - Season data to save
   */
  async saveCurrentSeason(seasonData) {
    await fs.writeFile(CURRENT_SEASON_PATH, JSON.stringify(seasonData, null, 2));
  }
  
  /**
   * Load a specific season by ID
   * @param {string} seasonId - Season ID or filename (without .json)
   * @returns {Object|null} Season data or null if not found
   */
  async loadSeason(seasonId) {
    try {
      const seasonPath = path.join(SEASONS_PATH, `${seasonId}.json`);
      const data = await fs.readFile(seasonPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading season ${seasonId}:`, error);
      return null;
    }
  }
  
  /**
   * Create a new season
   * @param {string} name - Season name
   * @param {string} description - Season description
   * @returns {Object} New season data
   */
  async createSeason(name, description) {
    // Archive current season if it exists
    try {
      const currentSeason = await this.loadCurrentSeason();
      if (currentSeason) {
        // Set end date if not already set
        if (!currentSeason.endDate) {
          currentSeason.endDate = new Date().toISOString().split('T')[0];
        }
        
        // Generate season ID based on name
        const seasonId = currentSeason.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Save to archive
        await fs.writeFile(
          path.join(SEASONS_PATH, `${seasonId}.json`),
          JSON.stringify(currentSeason, null, 2)
        );
      }
    } catch (error) {
      console.error('Error archiving current season:', error);
    }
    
    // Create new season
    const newSeason = {
      name,
      description: description || `${name} - SEMO Smash Season`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      events: [],
      playerRecords: {},
      headToHeadRecords: {},
      rankings: []
    };
    
    // Save as current season
    await this.saveCurrentSeason(newSeason);
    
    return newSeason;
  }
  
  /**
   * End the current season
   * @param {Array} currentRankings - Current rankings to save with the season
   * @returns {Object} Updated season data
   */
  async endSeason(currentRankings) {
    const seasonData = await this.loadCurrentSeason();
    
    // Set end date
    seasonData.endDate = new Date().toISOString().split('T')[0];
    
    // Save final rankings
    seasonData.rankings = currentRankings.map(player => ({
      id: player.id,
      tag: player.tag,
      score: player.score,
      trueskill: player.trueskill,
      wins: player.wins || 0,
      losses: player.losses || 0,
      rank: player.rank
    }));
    
    // Save updated season
    await this.saveCurrentSeason(seasonData);
    
    // Archive the season
    const seasonId = seasonData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    await fs.writeFile(
      path.join(SEASONS_PATH, `${seasonId}.json`),
      JSON.stringify(seasonData, null, 2)
    );
    
    return seasonData;
  }
  
  /**
   * Add a tournament to the current season
   * @param {Object} tournamentData - Tournament data from Start.gg
   * @returns {Object} Updated season data
   */
  async addTournament(tournamentData) {
    const seasonData = await this.loadCurrentSeason();
    
    // Check if tournament is already in the season
    const existingIndex = seasonData.events.findIndex(
      event => event.id === tournamentData.id || event.slug === tournamentData.slug
    );
    
    if (existingIndex >= 0) {
      // Update existing tournament
      seasonData.events[existingIndex] = {
        id: tournamentData.id,
        slug: tournamentData.slug,
        name: tournamentData.name,
        startAt: tournamentData.startAt,
        endAt: tournamentData.endAt,
        numAttendees: tournamentData.numAttendees,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new tournament
      seasonData.events.push({
        id: tournamentData.id,
        slug: tournamentData.slug,
        name: tournamentData.name,
        startAt: tournamentData.startAt,
        endAt: tournamentData.endAt,
        numAttendees: tournamentData.numAttendees,
        addedAt: new Date().toISOString()
      });
    }
    
    // Import tournament matches for season rankings
    try {
      // This will be performed asynchronously but we still want to save the season data
      this.importTournamentMatches(tournamentData);
    } catch (error) {
      console.error(`Error importing matches for tournament ${tournamentData.name}:`, error);
    }
    
    // Save updated season
    await this.saveCurrentSeason(seasonData);
    
    return seasonData;
  }
  
  /**
   * Remove a tournament from the current season
   * @param {string} tournamentSlug - Tournament slug to remove
   * @returns {Object} Updated season data
   */
  async removeTournament(tournamentSlug) {
    const seasonData = await this.loadCurrentSeason();
    
    // Format the slug if needed
    let formattedSlug = tournamentSlug;
    if (!formattedSlug.includes('/')) {
      formattedSlug = `tournament/${formattedSlug}`;
    }
    
    // Find the tournament
    const eventIndex = seasonData.events.findIndex(event => 
      event.slug === formattedSlug || event.slug.includes(tournamentSlug)
    );
    
    if (eventIndex === -1) {
      throw new Error(`Tournament "${tournamentSlug}" is not in the current season.`);
    }
    
    // Remove the tournament
    const removedEvent = seasonData.events.splice(eventIndex, 1)[0];
    
    // Save updated season
    await this.saveCurrentSeason(seasonData);
    
    return { seasonData, removedEvent };
  }
  
  /**
   * Record a match in the current season
   * @param {Object} matchData - Match data
   * @returns {Object} Updated season data
   */
  async recordMatch(matchData) {
    const seasonData = await this.loadCurrentSeason();
    
    // Check if this is a duplicate match (same players, same tournament, same score)
    const h2hKey = [matchData.winner, matchData.loser].sort().join('_vs_');
    if (seasonData.headToHeadRecords[h2hKey]) {
      const isDuplicate = seasonData.headToHeadRecords[h2hKey].matches.some(match => 
        match.winner === matchData.winner &&
        match.loser === matchData.loser &&
        match.score === matchData.score &&
        match.tournament === matchData.tournament
      );
      
      if (isDuplicate) {
        console.log(`Skipping duplicate match: ${matchData.winner} vs ${matchData.loser} (${matchData.score}) in ${matchData.tournament}`);
        return { seasonData, duplicate: true };
      }
    }
    
    // Initialize player records if they don't exist
    if (!seasonData.playerRecords[matchData.winner]) {
      seasonData.playerRecords[matchData.winner] = {
        tag: matchData.winner,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        tournamentWins: 0,
        opponents: {} // Strength of schedule tracking
      };
    }
    
    if (!seasonData.playerRecords[matchData.loser]) {
      seasonData.playerRecords[matchData.loser] = {
        tag: matchData.loser,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        tournamentWins: 0,
        opponents: {}
      };
    }
    
    // Update player records
    seasonData.playerRecords[matchData.winner].matchesPlayed++;
    seasonData.playerRecords[matchData.winner].wins++;
    seasonData.playerRecords[matchData.loser].matchesPlayed++;
    seasonData.playerRecords[matchData.loser].losses++;
    
    // Update opponent tracking (strength of schedule)
    if (!seasonData.playerRecords[matchData.winner].opponents[matchData.loser]) {
      seasonData.playerRecords[matchData.winner].opponents[matchData.loser] = { wins: 0, losses: 0 };
    }
    if (!seasonData.playerRecords[matchData.loser].opponents[matchData.winner]) {
      seasonData.playerRecords[matchData.loser].opponents[matchData.winner] = { wins: 0, losses: 0 };
    }
    
    seasonData.playerRecords[matchData.winner].opponents[matchData.loser].wins++;
    seasonData.playerRecords[matchData.loser].opponents[matchData.winner].losses++;
    
    // Update head-to-head records
    if (!seasonData.headToHeadRecords[h2hKey]) {
      seasonData.headToHeadRecords[h2hKey] = {
        players: [matchData.winner, matchData.loser],
        matches: []
      };
    }
    
    // Add match to head-to-head record
    seasonData.headToHeadRecords[h2hKey].matches.push({
      winner: matchData.winner,
      loser: matchData.loser,
      score: matchData.score,
      tournament: matchData.tournament,
      date: matchData.reportedAt || new Date().toISOString()
    });
    
    // Save updated season
    await this.saveCurrentSeason(seasonData);
    
    return { seasonData, duplicate: false };
  }
  
  /**
   * Get all available seasons
   * @returns {Array} Array of season objects with id and name
   */
  async getAvailableSeasons() {
    try {
      const files = await fs.readdir(SEASONS_PATH);
      const seasons = [];
      
      // Get current season
      const currentSeason = await this.loadCurrentSeason();
      seasons.push({
        id: 'current',
        name: currentSeason.name,
        startDate: currentSeason.startDate,
        endDate: currentSeason.endDate || 'Ongoing',
        isCurrent: true
      });
      
      // Get past seasons
      for (const file of files) {
        if (file === 'current.json') continue;
        
        if (file.endsWith('.json')) {
          const seasonId = file.replace('.json', '');
          const seasonData = await this.loadSeason(seasonId);
          
          if (seasonData) {
            seasons.push({
              id: seasonId,
              name: seasonData.name,
              startDate: seasonData.startDate,
              endDate: seasonData.endDate,
              isCurrent: false
            });
          }
        }
      }
      
      return seasons;
    } catch (error) {
      console.error('Error getting available seasons:', error);
      return [];
    }
  }
  
  /**
   * Calculate strength of schedule for all players in a season
   * @param {Object} seasonData - Season data
   * @param {Array} rankings - Current player rankings
   * @returns {Object} Season data with strength of schedule added
   */
  calculateStrengthOfSchedule(seasonData, rankings) {
    // Create a map of player tags to their ranking
    const rankingMap = {};
    rankings.forEach(player => {
      rankingMap[player.tag] = player;
    });
    
    // Calculate strength of schedule for each player
    Object.keys(seasonData.playerRecords).forEach(playerTag => {
      const playerRecord = seasonData.playerRecords[playerTag];
      let totalOpponentRating = 0;
      let totalOpponents = 0;
      
      // Calculate average opponent rating
      Object.keys(playerRecord.opponents).forEach(opponentTag => {
        const opponent = rankingMap[opponentTag];
        if (opponent) {
          const matches = playerRecord.opponents[opponentTag].wins + playerRecord.opponents[opponentTag].losses;
          totalOpponentRating += opponent.score * matches;
          totalOpponents += matches;
        }
      });
      
      // Store strength of schedule
      playerRecord.strengthOfSchedule = totalOpponents > 0 
        ? Math.round(totalOpponentRating / totalOpponents) 
        : 0;
    });
    
    return seasonData;
  }
  
  /**
   * Import matches from a tournament into the current season
   * @param {Object} tournamentData - Tournament data from Start.gg
   * @returns {Promise<void>}
   */
  async importTournamentMatches(tournamentData) {
    try {
      // Import dynamically
      const { default: fetch } = await import('node-fetch');
      const { gql } = await import('graphql-request');
      const config = require('../../config');
      
      if (!config.startggApiKey || config.startggApiKey === 'your_startgg_api_key_here') {
        throw new Error('Start.gg API key is not configured. Please add it to your .env file.');
      }
      
      // Get all events from the tournament
      if (!tournamentData.events || tournamentData.events.length === 0) {
        console.log(`No events found for tournament ${tournamentData.name}`);
        return { matchesImported: 0, matchesSkipped: 0, events: 0 };
      }
      
      // Track import statistics
      let totalMatchesImported = 0;
      let totalMatchesSkipped = 0;
      
      // For each event, get the sets
      for (const event of tournamentData.events) {
        console.log(`Importing matches from event: ${event.name}`);
        
        const STARTGG_API_ENDPOINT = 'https://api.start.gg/gql/alpha';
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.startggApiKey}`,
        };
        
        // Query to get sets from an event
        const setsQuery = gql`
          query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
            event(id: $eventId) {
              id
              name
              sets(
                page: $page
                perPage: $perPage
                sortType: STANDARD
                filters: {
                  state: [3] # 3 = completed sets
                }
              ) {
                pageInfo {
                  total
                  totalPages
                }
                nodes {
                  id
                  displayScore
                  winnerId
                  slots {
                    id
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
                    standing {
                      placement
                    }
                  }
                }
              }
            }
          }
        `;
        
        // Get first page to determine total pages
        const eventId = event.id;
        const perPage = 50;
        
        const response = await fetch(STARTGG_API_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: setsQuery,
            variables: { eventId, page: 1, perPage }
          })
        });
        
        const firstPageData = await response.json();
        
        if (firstPageData.errors) {
          console.error(`Error fetching sets for event ${event.name}:`, firstPageData.errors);
          continue;
        }
        
        if (!firstPageData.data?.event?.sets) {
          console.log(`No sets found for event ${event.name}`);
          continue;
        }
        
        const totalPages = firstPageData.data.event.sets.pageInfo.totalPages;
        const allSets = [...firstPageData.data.event.sets.nodes];
        
        // Fetch remaining pages if needed
        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page++) {
            console.log(`Fetching sets page ${page}/${totalPages} for event ${event.name}...`);
            
            const pageResponse = await fetch(STARTGG_API_ENDPOINT, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                query: setsQuery,
                variables: { eventId, page, perPage }
              })
            });
            
            const pageData = await pageResponse.json();
            
            if (pageData.errors) {
              console.error(`Error fetching sets for event ${event.name}, page ${page}:`, pageData.errors);
              continue;
            }
            
            allSets.push(...pageData.data.event.sets.nodes);
          }
        }
        
        console.log(`Found ${allSets.length} sets for event ${event.name}. Processing...`);
        
        let eventMatchesImported = 0;
        let eventMatchesSkipped = 0;
        
        // Process each set and record in season data
        for (const set of allSets) {
          try {
            // Skip DQs or byes (these typically have null slots or incomplete data)
            if (!set.slots || set.slots.length !== 2 || 
                !set.slots[0].entrant || !set.slots[1].entrant ||
                !set.displayScore) {
              eventMatchesSkipped++;
              continue;
            }
            
            // Extract player info
            const player1 = {
              id: set.slots[0].entrant.id,
              tag: set.slots[0].entrant.name,
              gamerTag: set.slots[0].entrant.participants?.[0]?.player?.gamerTag || set.slots[0].entrant.name
            };
            
            const player2 = {
              id: set.slots[1].entrant.id,
              tag: set.slots[1].entrant.name,
              gamerTag: set.slots[1].entrant.participants?.[0]?.player?.gamerTag || set.slots[1].entrant.name
            };
            
            // Determine winner and loser
            let winner, loser;
            if (set.winnerId === player1.id) {
              winner = player1;
              loser = player2;
            } else if (set.winnerId === player2.id) {
              winner = player2;
              loser = player1;
            } else {
              // Skip if winner is unclear
              continue;
            }
            
            // Parse score
            const scoreStr = set.displayScore || 'N/A';
            
            // Record match in season
            const result = await this.recordMatch({
              winner: winner.gamerTag,
              loser: loser.gamerTag,
              score: scoreStr,
              tournament: tournamentData.name,
              reportedAt: new Date().toISOString(),
              source: 'tournament-import'
            });
            
            // Check if the match was a duplicate or was successfully added
            if (result && result.duplicate) {
              eventMatchesSkipped++;
            } else {
              eventMatchesImported++;
            }
          } catch (error) {
            console.error(`Error processing set in event ${event.name}:`, error);
            eventMatchesSkipped++;
            // Continue with other sets
            continue;
          }
        }
        
        // Add event stats to total
        totalMatchesImported += eventMatchesImported;
        totalMatchesSkipped += eventMatchesSkipped;
        
        console.log(`Event ${event.name}: Imported ${eventMatchesImported} matches, skipped ${eventMatchesSkipped} matches`);
      }
      
      console.log(`Successfully imported ${totalMatchesImported} matches from tournament: ${tournamentData.name}`);
      return {
        matchesImported: totalMatchesImported,
        matchesSkipped: totalMatchesSkipped,
        events: tournamentData.events.length
      };
    } catch (error) {
      console.error(`Error importing matches for tournament ${tournamentData.name}:`, error);
      return { error: error.message, matchesImported: 0, matchesSkipped: 0, events: 0 };
    }
  }
  
  /**
   * Get season rankings based on win percentage and strength of schedule
   * @param {string} seasonId - Season ID or 'current'
   * @returns {Array} Array of ranked players for the season
   */
  async getSeasonRankings(seasonId = 'current') {
    let seasonData;
    
    if (seasonId === 'current') {
      seasonData = await this.loadCurrentSeason();
    } else {
      seasonData = await this.loadSeason(seasonId);
    }
    
    if (!seasonData) {
      throw new Error(`Season ${seasonId} not found`);
    }
    
    // If season is completed and has rankings, return those
    if (seasonData.endDate && seasonData.rankings.length > 0) {
      return seasonData.rankings;
    }      // Otherwise, calculate rankings based on season records
    const playerRecords = Object.values(seasonData.playerRecords);
    
    // Filter to players with at least 1 match (reduced from 3 to include tournament imports)
    const qualifiedPlayers = playerRecords.filter(player => player.matchesPlayed >= 1);
    
    // Calculate win percentage
    qualifiedPlayers.forEach(player => {
      player.winPercentage = player.matchesPlayed > 0 
        ? (player.wins / player.matchesPlayed) * 100 
        : 0;
      
      // Add a display field to indicate if this is from an imported tournament
      player.source = 'season';
    });
    
    // Sort by win percentage (primary) and strength of schedule (secondary)
    qualifiedPlayers.sort((a, b) => {
      // First sort by win percentage
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      
      // If win percentage is tied, sort by strength of schedule
      return (b.strengthOfSchedule || 0) - (a.strengthOfSchedule || 0);
    });
    
    // Add rank property
    return qualifiedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  }
}

module.exports = SeasonManager;
