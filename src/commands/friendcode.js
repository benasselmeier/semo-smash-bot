const { addOrUpdatePlayer, getPlayerByDiscordId } = require('../utils/dataStore');

module.exports = {
  name: 'friendcode',
  aliases: ['fc'],
  description: 'View or set your Nintendo Switch friend code',
  async execute(message, args) {
    try {
      const discordId = message.author.id;
      const existingPlayer = await getPlayerByDiscordId(discordId);

      if (args.length === 0) {
        if (existingPlayer && existingPlayer.friendCode) {
          const code = existingPlayer.friendCode.replace(/(\d{4})(\d{4})(\d{4})/, 'SW-$1-$2-$3');
          return message.reply(`Your registered friend code is **${code}**.`);
        }
        return message.reply('You have not registered a friend code yet. Use `!friendcode <code>` to register one.');
      }

      const rawInput = args.join('');
      const digits = rawInput.replace(/sw|SW|[^0-9]/g, '');

      if (digits.length !== 12) {
        return message.reply('Invalid friend code format. Please provide a 12-digit code. Example: `SW-1234-5678-9012`');
      }

      const tag = existingPlayer?.tag || (message.member ? message.member.displayName : message.author.username);

      await addOrUpdatePlayer({
        discordId,
        tag,
        friendCode: digits
      });

      const formatted = digits.replace(/(\d{4})(\d{4})(\d{4})/, 'SW-$1-$2-$3');
      message.reply(`Your friend code has been registered as **${formatted}**.`);
    } catch (error) {
      console.error('Error handling friendcode command:', error);
      message.reply('There was an error processing your friend code.');
    }
  }
};
