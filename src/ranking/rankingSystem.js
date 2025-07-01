const fs = require('fs').promises;
const path = require('path');

// Base RankingSystem class to be extended by specific algorithms
class RankingSystem {
  constructor() {
    this.name = 'Abstract Ranking System';
  }

  /**
   * Calculate new ratings for both players after a match
   * @param {Object} winner - Winner player object
   * @param {Object} loser - Loser player object
   * @param {Object} matchDetails - Additional match details (e.g., score, tournament)
   * @returns {Object} Updated ratings for both players
   */
  calculateNewRatings(winner, loser, matchDetails) {
    throw new Error('Method calculateNewRatings must be implemented by subclasses');
  }

  /**
   * Get the player's rating value(s) as a single comparable number
   * @param {Object} player - Player object
   * @returns {number} Comparable rating value
   */
  getRatingValue(player) {
    throw new Error('Method getRatingValue must be implemented by subclasses');
  }

  /**
   * Initialize a new player with default rating values
   * @returns {Object} Default rating values
   */
  getDefaultRating() {
    throw new Error('Method getDefaultRating must be implemented by subclasses');
  }

  /**
   * Sort players according to this ranking system's rules
   * @param {Array} players - Array of player objects
   * @returns {Array} Sorted array of player objects
   */
  sortPlayers(players) {
    // Default implementation: sort by rating value descending
    return [...players].sort((a, b) => this.getRatingValue(b) - this.getRatingValue(a));
  }
}

module.exports = {
  RankingSystem
};
