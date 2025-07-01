const { isModerator } = require('../utils/permissions');

module.exports = {
  name: 'reset-auto-import',
  description: 'Reset the auto-import cache (moderators only)',
  async execute(message, args) {
    // Check if user is a moderator
    if (!isModerator(message.member)) {
      return message.reply('You do not have permission to reset the auto-import cache. This command is for moderators only.');
    }
    
    try {
      // Access the startgg module and reset the recentImports map
      const startgg = require('../utils/startgg');
      
      if (startgg.resetAutoImportCache) {
        const count = startgg.resetAutoImportCache();
        return message.reply(`✅ Successfully cleared the auto-import cache (${count} entries removed).`);
      } else {
        return message.reply('The auto-import cache reset function is not available in the current version.');
      }
    } catch (error) {
      console.error('Error in reset-auto-import command:', error);
      message.reply('There was an error resetting the auto-import cache.');
    }
  }
};
