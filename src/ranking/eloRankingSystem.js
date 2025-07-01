const { RankingSystem } = require('./rankingSystem');

class EloRankingSystem extends RankingSystem {
  constructor(config = {}) {
    super();
    this.name = 'Elo Rating System';
    this.defaultRating = config.defaultRating || 1000;
    this.kFactor = config.kFactor || 32;
  }

  /**
   * Calculate new ratings for both players after a match
   * @param {Object} winner - Winner player object
   * @param {Object} loser - Loser player object
   * @param {Object} matchDetails - Additional match details (e.g., score, tournament)
   * @returns {Object} Updated ratings for both players
   */
  calculateNewRatings(winner, loser, matchDetails) {
    // Get current ratings (or default if not present)
    const winnerRating = winner.score || this.defaultRating;
    const loserRating = loser.score || this.defaultRating;

    // Calculate expected scores (probability of winning)
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    // Calculate new K factor based on experience or importance
    const winnerK = this.getKFactor(winner, matchDetails);
    const loserK = this.getKFactor(loser, matchDetails);
    
    // Calculate new ratings
    const newWinnerRating = Math.round(winnerRating + winnerK * (1 - expectedScoreWinner));
    const newLoserRating = Math.round(loserRating + loserK * (0 - expectedScoreLoser));

    return {
      winner: { score: newWinnerRating },
      loser: { score: newLoserRating }
    };
  }

  /**
   * Get the player's rating value as a single comparable number
   * @param {Object} player - Player object
   * @returns {number} Comparable rating value
   */
  getRatingValue(player) {
    return player.score || this.defaultRating;
  }

  /**
   * Initialize a new player with default rating values
   * @returns {Object} Default rating values
   */
  getDefaultRating() {
    return { score: this.defaultRating };
  }

  /**
   * Determine the K-factor based on player experience and match importance
   * @param {Object} player - Player object
   * @param {Object} matchDetails - Match details
   * @returns {number} K-factor to use
   */
  getKFactor(player, matchDetails) {
    // Default K-factor is 32
    let kFactor = this.kFactor;
    
    // Adjust K-factor based on matches played (more experienced players have lower K)
    if (player.matchesPlayed > 30) {
      kFactor = 24;
    }
    if (player.matchesPlayed > 100) {
      kFactor = 16;
    }
    
    // Adjust K-factor based on tournament importance (if specified)
    if (matchDetails?.tournament?.importance === 'major') {
      kFactor *= 1.5; // Major tournaments have 50% more impact
    }
    
    return kFactor;
  }
}

module.exports = EloRankingSystem;
