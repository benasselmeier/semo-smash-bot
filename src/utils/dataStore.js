const fs = require('fs').promises;
const path = require('path');
const RankingManager = require('../ranking/rankingManager');
const SeasonManager = require('../ranking/seasonManager');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../../data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');

// Initialize ranking and season managers
const rankingManager = new RankingManager();
const seasonManager = new SeasonManager();

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}  // Load data from file
async function loadData(filePath, defaultData = {}) {
  try {
    await ensureDataDir();
    let actualPath = filePath;
    if (filePath === 'matches') {
      actualPath = MATCHES_FILE;
    } else if (filePath === 'players') {
      actualPath = PLAYERS_FILE;
    }
    const data = await fs.readFile(actualPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return default and create it
      await saveData(filePath, defaultData);
      return defaultData;
    }
    console.error(`Error loading data from ${filePath}:`, error);
    return defaultData;
  }
}

// Save data to file
async function saveData(filePath, data) {
  try {
    await ensureDataDir();
    let actualPath = filePath;
    if (filePath === 'matches') {
      actualPath = MATCHES_FILE;
    } else if (filePath === 'players') {
      actualPath = PLAYERS_FILE;
    }
    await fs.writeFile(actualPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    return false;
  }
}

// Player data functions
async function getPlayers() {
  return loadData(PLAYERS_FILE, { players: [] });
}

async function savePlayers(playersData) {
  await ensureDataDir();
  await fs.writeFile(PLAYERS_FILE, JSON.stringify(playersData, null, 2), 'utf8');
  return true;
}

async function getPlayerByDiscordId(discordId) {
  const { players } = await getPlayers();
  return players.find(player => player.discordId === discordId);
}

async function getPlayerByTag(tag) {
  const { players } = await getPlayers();
  return players.find(player => 
    player.tag.toLowerCase() === tag.toLowerCase() || 
    (player.aliases && player.aliases.some(alias => alias.toLowerCase() === tag.toLowerCase()))
  );
}

async function addOrUpdatePlayer(playerData) {
  const { players } = await getPlayers();
  
  // Check for existing player by various methods
  let existingPlayerIndex = -1;
  
  // First check by Discord ID if available
  if (playerData.discordId) {
    existingPlayerIndex = players.findIndex(p => p.discordId === playerData.discordId);
  }
  
  // If not found and we have a Start.gg ID, check by that
  if (existingPlayerIndex < 0 && playerData.startggId) {
    existingPlayerIndex = players.findIndex(p => p.startggId === playerData.startggId);
  }
  
  // Last resort, check by tag
  if (existingPlayerIndex < 0) {
    existingPlayerIndex = players.findIndex(p => 
      p.tag.toLowerCase() === playerData.tag.toLowerCase() ||
      (p.aliases && p.aliases.some(alias => alias.toLowerCase() === playerData.tag.toLowerCase()))
    );
  }
  
  if (existingPlayerIndex >= 0) {
    // Update existing player
    players[existingPlayerIndex] = {
      ...players[existingPlayerIndex],
      ...playerData,
      updatedAt: new Date().toISOString()
    };
  } else {
    // Add new player with default rating from the ranking system
    const defaultRating = rankingManager.getDefaultRating();
    
    players.push({
      ...playerData,
      ...defaultRating, // This adds the appropriate rating properties based on the active system
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      matchesPlayed: playerData.matchesPlayed || 0,
      wins: playerData.wins || 0,
      losses: playerData.losses || 0
    });
  }
  
  return savePlayers({ players });
}

// Match data functions
async function getMatches() {
  return loadData('matches', { matches: [] });
}

async function saveMatches(matchesData) {
  await ensureDataDir();
  await fs.writeFile(MATCHES_FILE, JSON.stringify(matchesData, null, 2), 'utf8');
  return true;
}

async function addMatch(matchData) {
  const { matches } = await getMatches();
  const newMatch = {
    ...matchData,
    id: Date.now().toString(),
    reportedAt: new Date().toISOString()
  };
  
  matches.push(newMatch);
  await saveMatches({ matches });
  
  // Update player stats
  await updatePlayerStats(newMatch);
  
  // Record match in current season
  try {
    await seasonManager.recordMatch(newMatch);
  } catch (error) {
    console.error('Error recording match in season:', error);
  }
  
  return newMatch;
}

async function updatePlayerStats(match) {
  const { players } = await getPlayers();
  const winner = players.findIndex(p => p.tag.toLowerCase() === match.winner.toLowerCase());
  const loser = players.findIndex(p => p.tag.toLowerCase() === match.loser.toLowerCase());
  
  if (winner >= 0 && loser >= 0) {
    // Update match counts
    players[winner].matchesPlayed = (players[winner].matchesPlayed || 0) + 1;
    players[winner].wins = (players[winner].wins || 0) + 1;
    players[loser].matchesPlayed = (players[loser].matchesPlayed || 0) + 1;
    players[loser].losses = (players[loser].losses || 0) + 1;
    
    // Create match details object for the ranking system
    const matchDetails = {
      score: match.score,
      tournament: match.tournament,
      date: match.reportedAt
    };
    
    // Calculate new ratings using the ranking manager
    const newRatings = rankingManager.calculateMatchResult(players[winner], players[loser], matchDetails);
    
    // Apply the new ratings
    Object.assign(players[winner], newRatings.winner);
    Object.assign(players[loser], newRatings.loser);
    
    // Update lastPlayed
    players[winner].lastPlayed = match.reportedAt;
    players[loser].lastPlayed = match.reportedAt;
    
    await savePlayers({ players });
  }
}

// Get rankings sorted by the active ranking system
async function getRankings() {
  const { players } = await getPlayers();
  return rankingManager.getRankings(
    players.filter(player => player.matchesPlayed > 0) // Only rank players who have played matches
  );
}

// Get season rankings
async function getSeasonRankings(seasonId = 'current') {
  try {
    return await seasonManager.getSeasonRankings(seasonId);
  } catch (error) {
    console.error(`Error getting rankings for season ${seasonId}:`, error);
    return [];
  }
}

// Get all available seasons
async function getAvailableSeasons() {
  try {
    return await seasonManager.getAvailableSeasons();
  } catch (error) {
    console.error('Error getting available seasons:', error);
    return [];
  }
}

// Create a new season
async function createSeason(name, description) {
  try {
    return await seasonManager.createSeason(name, description);
  } catch (error) {
    console.error('Error creating season:', error);
    throw error;
  }
}

// End current season and archive it
async function endCurrentSeason() {
  try {
    const rankings = await getRankings();
    return await seasonManager.endSeason(rankings);
  } catch (error) {
    console.error('Error ending season:', error);
    throw error;
  }
}

// Add tournament to current season
async function addTournamentToSeason(tournamentData) {
  try {
    return await seasonManager.addTournament(tournamentData);
  } catch (error) {
    console.error('Error adding tournament to season:', error);
    throw error;
  }
}

// Remove tournament from current season
async function removeTournamentFromSeason(tournamentSlug) {
  try {
    return await seasonManager.removeTournament(tournamentSlug);
  } catch (error) {
    console.error('Error removing tournament from season:', error);
    throw error;
  }
}

// Get head-to-head record between two players
async function getHeadToHead(player1, player2) {
  try {
    const seasonData = await seasonManager.loadCurrentSeason();
    
    // Create the key (players sorted alphabetically)
    const h2hKey = [player1, player2].sort().join('_vs_');
    
    return seasonData.headToHeadRecords[h2hKey] || {
      players: [player1, player2],
      matches: []
    };
  } catch (error) {
    console.error('Error getting head-to-head record:', error);
    return {
      players: [player1, player2],
      matches: []
    };
  }
}

// General data access functions
async function getData(type) {
  switch (type) {
    case 'players':
      const playersData = await getPlayers();
      return playersData.players || [];
    case 'matches':
      const matchesData = await getMatches();
      if (!matchesData || !matchesData.matches) return [];
      return Array.isArray(matchesData.matches) ? matchesData.matches : [];
    case 'tournaments':
      const tournamentsData = await loadData(DATA_PATHS.tournaments, { tournaments: [] });
      return tournamentsData.tournaments || [];
    default:
      throw new Error(`Unknown data type: ${type}`);
  }
}

async function saveData(type, data) {
  switch (type) {
    case 'players':
      return savePlayers({ players: data });
    case 'matches':
      return saveMatches({ matches: data });
    case 'tournaments':
      return fs.writeFile(DATA_PATHS.tournaments, JSON.stringify({ tournaments: data }, null, 2), 'utf8');
    default:
      throw new Error(`Unknown data type: ${type}`);
  }
}

// Get active ranking system info
function getRankingSystemInfo() {
  return {
    name: rankingManager.getActiveSystemName(),
    availableSystems: rankingManager.getAvailableSystems()
  };
}

// Change active ranking system
async function setRankingSystem(systemName) {
  return rankingManager.setActiveSystem(systemName);
}

const DATA_TYPES = {
    matches: 'matches',
    players: 'players',
    tournaments: 'tournaments',
    seasons: 'seasons'
};

const DATA_PATHS = {
    matches: path.join(DATA_DIR, 'matches.json'),
    players: path.join(DATA_DIR, 'players.json'),
    tournaments: path.join(DATA_DIR, 'tournaments.json'),
    seasons: path.join(DATA_DIR, 'seasons.json')
};

module.exports = {
  // Player management
  getPlayers,
  getPlayerByDiscordId,
  getPlayerByTag,
  addOrUpdatePlayer,
  
  // Match management
  getMatches,
  addMatch,
  
  // Ranking functions
  getRankings,
  getRankingSystemInfo,
  setRankingSystem,
  
  // Season management
  getSeasonRankings,
  getAvailableSeasons,
  createSeason,
  endCurrentSeason,
  addTournamentToSeason,
  removeTournamentFromSeason,
  getHeadToHead,

  // General data access
  getData,
  saveData
};
