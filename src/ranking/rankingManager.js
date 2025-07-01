const fs = require('fs').promises;
const path = require('path');
const EloRankingSystem = require('./eloRankingSystem');
const TrueSkillRankingSystem = require('./trueSkillRankingSystem');

/**
 * Manages ranking systems and provides an interface for the bot to calculate rankings
 */
class RankingManager {
  constructor(config = {}) {
    this.config = config;
    
    // Initialize available ranking systems
    this.systems = {
      elo: new EloRankingSystem(config.elo || {}),
      trueskill: new TrueSkillRankingSystem(config.trueskill || {})
    };
    
    // Set the active system (default to elo)
    this.activeSystem = this.systems[config.activeSystem || 'elo'];
    
    // Settings file path
    this.settingsPath = path.join(__dirname, '../../data/rankingSettings.json');
    
    // Load settings
    this.loadSettings();
  }
  
  /**
   * Load ranking system settings from file
   */
  async loadSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Update active system if specified
      if (settings.activeSystem && this.systems[settings.activeSystem]) {
        this.activeSystem = this.systems[settings.activeSystem];
      }
      
      // Update system configs
      if (settings.elo && this.systems.elo) {
        Object.assign(this.systems.elo, new EloRankingSystem(settings.elo));
      }
      
      if (settings.trueskill && this.systems.trueskill) {
        Object.assign(this.systems.trueskill, new TrueSkillRankingSystem(settings.trueskill));
      }
      
      console.log(`Loaded ranking settings: using ${this.activeSystem.name}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading ranking settings:', error);
      }
      
      // Create default settings file if it doesn't exist
      this.saveSettings();
    }
  }
  
  /**
   * Save current ranking system settings to file
   */
  async saveSettings() {
    // Create settings object
    const settings = {
      activeSystem: Object.keys(this.systems).find(key => this.systems[key] === this.activeSystem) || 'elo',
      elo: {
        defaultRating: this.systems.elo.defaultRating,
        kFactor: this.systems.elo.kFactor
      },
      trueskill: {
        defaultMu: this.systems.trueskill.defaultMu,
        defaultSigma: this.systems.trueskill.defaultSigma,
        beta: this.systems.trueskill.beta,
        tau: this.systems.trueskill.tau
      }
    };
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
      
      // Write settings file
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('Error saving ranking settings:', error);
    }
  }
  
  /**
   * Set the active ranking system
   * @param {string} systemName - Name of the system to use ('elo' or 'trueskill')
   * @returns {boolean} Success status
   */
  setActiveSystem(systemName) {
    if (this.systems[systemName]) {
      this.activeSystem = this.systems[systemName];
      this.saveSettings();
      return true;
    }
    return false;
  }
  
  /**
   * Calculate new ratings after a match
   * @param {Object} winner - Winner player object
   * @param {Object} loser - Loser player object
   * @param {Object} matchDetails - Additional match details
   * @returns {Object} Object containing updated player rating data
   */
  calculateMatchResult(winner, loser, matchDetails) {
    return this.activeSystem.calculateNewRatings(winner, loser, matchDetails);
  }
  
  /**
   * Get default rating values for new players
   * @returns {Object} Default rating values
   */
  getDefaultRating() {
    return this.activeSystem.getDefaultRating();
  }
  
  /**
   * Sort players according to the active ranking system
   * @param {Array} players - Array of player objects
   * @returns {Array} Sorted array of player objects with rank property added
   */
  getRankings(players) {
    const rankedPlayers = this.activeSystem.sortPlayers(players);
    
    // Add rank property to each player
    return rankedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
      // Add displayRating property for UI consistency
      displayRating: this.getDisplayRating(player)
    }));
  }
  
  /**
   * Get a display-friendly rating value
   * @param {Object} player - Player object
   * @returns {string} Formatted rating for display
   */
  getDisplayRating(player) {
    if (this.activeSystem === this.systems.elo) {
      return player.score ? player.score.toString() : this.activeSystem.defaultRating.toString();
    } else if (this.activeSystem === this.systems.trueskill) {
      if (!player.trueskill) return Math.round(this.activeSystem.defaultMu - 3 * this.activeSystem.defaultSigma).toString();
      
      const mu = player.trueskill.mu?.toFixed(1) || this.activeSystem.defaultMu.toFixed(1);
      const sigma = player.trueskill.sigma?.toFixed(1) || this.activeSystem.defaultSigma.toFixed(1);
      
      return `${mu}±${sigma}`;
    }
    
    // Fallback display value
    return this.activeSystem.getRatingValue(player).toString();
  }
  
  /**
   * Get the active ranking system name
   * @returns {string} Name of the active ranking system
   */
  getActiveSystemName() {
    return this.activeSystem.name;
  }
  
  /**
   * Get a list of available ranking systems
   * @returns {Array} Array of available system names
   */
  getAvailableSystems() {
    return Object.keys(this.systems);
  }
}

module.exports = RankingManager;
