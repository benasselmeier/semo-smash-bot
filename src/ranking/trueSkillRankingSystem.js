const { RankingSystem } = require('./rankingSystem');

class TrueSkillRankingSystem extends RankingSystem {
  constructor(config = {}) {
    super();
    this.name = 'TrueSkill Rating System';
    this.defaultMu = config.defaultMu || 25; // Initial mean
    this.defaultSigma = config.defaultSigma || 8.333; // Initial standard deviation
    this.beta = config.beta || 4.166; // Skill factor
    this.tau = config.tau || 0.083; // Dynamic factor
    this.drawProbability = config.drawProbability || 0.10; // Default draw probability (10%)
  }

  /**
   * Calculate new ratings for both players after a match
   * @param {Object} winner - Winner player object
   * @param {Object} loser - Loser player object
   * @param {Object} matchDetails - Additional match details (e.g., score, tournament)
   * @returns {Object} Updated ratings for both players
   */
  calculateNewRatings(winner, loser, matchDetails) {
    // Extract or initialize mu and sigma values
    const winnerMu = winner.trueskill?.mu || this.defaultMu;
    const winnerSigma = winner.trueskill?.sigma || this.defaultSigma;
    const loserMu = loser.trueskill?.mu || this.defaultMu;
    const loserSigma = loser.trueskill?.sigma || this.defaultSigma;

    // Calculate c-squared (c²)
    const c_squared = 2 * Math.pow(this.beta, 2) + Math.pow(winnerSigma, 2) + Math.pow(loserSigma, 2);
    const c = Math.sqrt(c_squared);

    // Calculate match quality (probability that match will be a draw)
    const matchQuality = this.calculateMatchQuality(winnerMu, winnerSigma, loserMu, loserSigma);
    
    // Calculate the mean difference
    const meanDiff = winnerMu - loserMu;
    
    // Calculate v and w for the update
    const v = this.calculateV(meanDiff, c);
    const w = this.calculateW(v, c);
    
    // Calculate rank multiplier (1 for win, 0 for loss)
    const winnerRank = 0; // Lower rank is better in this implementation
    const loserRank = 1;
    
    // Calculate delta
    const winnerDelta = winnerSigma * winnerSigma / c * v;
    const loserDelta = loserSigma * loserSigma / c * v;
    
    // Update mu and sigma for winner and loser
    const newWinnerMu = winnerMu + winnerDelta * (winnerRank - loserRank);
    const newLoserMu = loserMu + loserDelta * (loserRank - winnerRank);
    
    const newWinnerSigma = winnerSigma * Math.sqrt(1 - winnerSigma * winnerSigma / c_squared * w);
    const newLoserSigma = loserSigma * Math.sqrt(1 - loserSigma * loserSigma / c_squared * w);
    
    // Apply dynamic factor (tau) for dynamics
    const finalWinnerSigma = Math.sqrt(Math.pow(newWinnerSigma, 2) + Math.pow(this.tau, 2));
    const finalLoserSigma = Math.sqrt(Math.pow(newLoserSigma, 2) + Math.pow(this.tau, 2));
    
    return {
      winner: {
        trueskill: {
          mu: newWinnerMu,
          sigma: finalWinnerSigma,
          conservativeRating: newWinnerMu - 3 * finalWinnerSigma // Conservative estimate (μ - 3σ)
        }
      },
      loser: {
        trueskill: {
          mu: newLoserMu,
          sigma: finalLoserSigma,
          conservativeRating: newLoserMu - 3 * finalLoserSigma // Conservative estimate (μ - 3σ)
        }
      }
    };
  }

  /**
   * Get the player's rating value as a single comparable number
   * @param {Object} player - Player object
   * @returns {number} Comparable rating value (conservative rating)
   */
  getRatingValue(player) {
    if (!player.trueskill) {
      return this.defaultMu - 3 * this.defaultSigma;
    }
    return player.trueskill.conservativeRating || (player.trueskill.mu - 3 * player.trueskill.sigma);
  }

  /**
   * Initialize a new player with default rating values
   * @returns {Object} Default rating values
   */
  getDefaultRating() {
    return {
      trueskill: {
        mu: this.defaultMu,
        sigma: this.defaultSigma,
        conservativeRating: this.defaultMu - 3 * this.defaultSigma
      }
    };
  }

  /**
   * Calculate the match quality (probability of draw)
   * @param {number} mu1 - First player's mean
   * @param {number} sigma1 - First player's standard deviation
   * @param {number} mu2 - Second player's mean
   * @param {number} sigma2 - Second player's standard deviation
   * @returns {number} Match quality (between 0 and 1)
   */
  calculateMatchQuality(mu1, sigma1, mu2, sigma2) {
    const betaSquared = Math.pow(this.beta, 2);
    const sigma1Squared = Math.pow(sigma1, 2);
    const sigma2Squared = Math.pow(sigma2, 2);
    
    const sqrt = Math.sqrt(
      (2 * betaSquared) / (2 * betaSquared + sigma1Squared + sigma2Squared)
    );
    
    const exp = Math.exp(
      (-1 * Math.pow(mu1 - mu2, 2)) / (2 * (2 * betaSquared + sigma1Squared + sigma2Squared))
    );
    
    return sqrt * exp;
  }

  /**
   * Calculate v for the TrueSkill update
   * @param {number} meanDiff - Difference in means
   * @param {number} c - Calculated c value
   * @returns {number} v value
   */
  calculateV(meanDiff, c) {
    const x = meanDiff / c;
    return this.vExceedsMargin(x);
  }

  /**
   * Calculate w for the TrueSkill update
   * @param {number} v - Calculated v value
   * @param {number} c - Calculated c value
   * @returns {number} w value
   */
  calculateW(v, c) {
    const x = v * (v + c);
    
    if (x > 0) {
      return x;
    }
    return 0;
  }

  /**
   * Calculate v exceeds margin function (approximation of the PDF/CDF for normal distribution)
   * @param {number} x - Normalized score difference
   * @returns {number} v value
   */
  vExceedsMargin(x) {
    const PDF = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-Math.pow(x, 2) / 2);
    const CDF = 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    
    if (CDF < 1e-10) {
      return -x;
    }
    
    return PDF / CDF;
  }

  /**
   * Error function approximation
   * @param {number} x - Input value
   * @returns {number} Approximate error function value
   */
  erf(x) {
    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // Save the sign of x
    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);

    // A&S formula 7.1.26
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }
}

module.exports = TrueSkillRankingSystem;
