const { addOrUpdatePlayer, getPlayerByDiscordId, getPlayerByTag } = require('../utils/dataStore');

module.exports = {
  name: 'register',
  description: 'Register yourself as a player or update your information',
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: !register "Your Tag" [character1,character2,...]\nExample: !register "SmashMaster42" Fox,Falco');
    }
    
    try {
      // Parse input with regex to handle quotes
      const fullText = args.join(' ');
      const tagRegex = /"([^"]*)"/;
      const tagMatch = fullText.match(tagRegex);
      
      if (!tagMatch) {
        return message.reply('Please provide your tag in quotes.\nExample: !register "SmashMaster42" Fox,Falco');
      }
      
      const tag = tagMatch[1].trim();
      
      // Check if tag is already in use by someone else
      const existingPlayer = await getPlayerByTag(tag);
      if (existingPlayer && existingPlayer.discordId && existingPlayer.discordId !== message.author.id) {
        return message.reply(`The tag "${tag}" is already registered to another player. Please choose a different tag.`);
      }
      
      // Extract characters if provided
      const charactersMatch = fullText.match(/"\s+(.+)$/);
      const characters = charactersMatch 
        ? charactersMatch[1].split(',').map(char => char.trim())
        : [];
      
      // Get existing player data if any
      const currentPlayer = await getPlayerByDiscordId(message.author.id);
      
      // Check if this player was auto-imported from a tournament
      let wasAutoImported = false;
      if (existingPlayer && !existingPlayer.discordId) {
        wasAutoImported = true;
      }
      
      // Prepare player data
      const playerData = {
        discordId: message.author.id,
        tag: tag,
        characters: characters.length > 0 ? characters : (currentPlayer?.characters || []),
        avatarURL: message.author.displayAvatarURL({ format: 'png', dynamic: true })
      };
      
      // Merge with existing auto-imported data if applicable
      if (wasAutoImported) {
        playerData.startggId = existingPlayer.startggId || null;
        playerData.score = existingPlayer.score || 1000;
        playerData.matchesPlayed = existingPlayer.matchesPlayed || 0;
        playerData.wins = existingPlayer.wins || 0;
        playerData.losses = existingPlayer.losses || 0;
      }
      
      // Add or update player
      await addOrUpdatePlayer(playerData);
      
      // Confirmation message
      const characterText = characters.length > 0 
        ? `\nMain characters: ${characters.join(', ')}` 
        : '';
      
      const autoImportText = wasAutoImported 
        ? '\n\nYour tournament data has been linked to your Discord account.' 
        : '';
      
      const embed = {
        color: 0x00FF00,
        title: '✅ Registration Successful',
        description: `You are now registered as **${tag}**${characterText}${autoImportText}`,
        thumbnail: {
          url: message.author.displayAvatarURL({ format: 'png', dynamic: true })
        },
        footer: {
          text: 'Use !rank to check your ranking'
        }
      };
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in register command:', error);
      message.reply('There was an error registering your information. Please try again.');
    }
  }
};
