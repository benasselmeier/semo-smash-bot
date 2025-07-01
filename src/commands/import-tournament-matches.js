const { isModerator } = require('../utils/permissions');
const { getTournamentBySlug } = require('../utils/startgg');
const SeasonManager = require('../ranking/seasonManager');

module.exports = {
  name: 'import-tournament-matches',
  description: 'Import matches from a tournament into the current season (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to import tournament matches. This command is for moderators only.');
    }
    
    if (args.length < 1) {
      return message.reply('Usage: `!import-tournament-matches tournament/genesis-9` or `!import-tournament-matches genesis-9`\n\nNote: This command is only needed if you want to manually import matches. Tournaments added to a season with `!season add` will automatically import matches.');
    }
    
    try {
      // Format the slug properly if needed
      let tournamentSlug = args[0].trim();
      if (!tournamentSlug.includes('/')) {
        tournamentSlug = `tournament/${tournamentSlug}`;
      }
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send(`Fetching tournament data for ${tournamentSlug}...`);
      
      // Fetch tournament data
      const tournamentData = await getTournamentBySlug(tournamentSlug);
      
      if (!tournamentData || !tournamentData.tournament) {
        return loadingMessage.edit(`Could not find tournament with slug: ${tournamentSlug}`);
      }
      
      // Create a new season manager instance
      const seasonManager = new SeasonManager();
      
      // Update message to show we're importing matches
      await loadingMessage.edit(`Found tournament "${tournamentData.tournament.name}". Importing matches...`);
      
      // Import tournament matches
      const importResult = await seasonManager.importTournamentMatches(tournamentData.tournament);
      
      if (importResult.error) {
        return loadingMessage.edit(`❌ Error importing matches: ${importResult.error}`);
      }
      
      // Update message with success and stats
      await loadingMessage.edit(`✅ Successfully imported ${importResult.matchesImported} matches from tournament "${tournamentData.tournament.name}" into the current season.${importResult.matchesSkipped > 0 ? `\n${importResult.matchesSkipped} matches were skipped (duplicates or invalid data).` : ''}`);
      
      // Wait a moment then suggest checking the PR
      setTimeout(async () => {
        await message.channel.send(`Use \`!pr\` to see the updated power rankings that include these tournament matches.`);
      }, 1500);
    } catch (error) {
      console.error('Error importing tournament matches:', error);
      message.reply('There was an error importing tournament matches. Check console for details.');
    }
  }
};
