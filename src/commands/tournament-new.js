const { getTournamentBySlug, autoImportParticipants } = require('../utils/startgg');

module.exports = {
  name: 'tournament',
  description: 'Look up a tournament by short slug',
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage: `!tournament [short-slug]`\nExample: `!tournament underground-smash-5`');
    }
    
    try {
      // Get the tournament slug from args
      const tournamentSlug = args[0].trim();
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send(`Fetching tournament data for ${tournamentSlug}...`);
      
      // Format the slug properly if needed
      let formattedSlug = tournamentSlug;
      if (!formattedSlug.includes('/')) {
        formattedSlug = `tournament/${formattedSlug}`;
      }
      
      // Fetch tournament data
      const tournamentData = await getTournamentBySlug(formattedSlug);
      
      if (!tournamentData) {
        return loadingMessage.edit(`Could not find tournament with slug: ${tournamentSlug}`);
      }
      
      // Auto-import participants
      try {
        await autoImportParticipants(formattedSlug);
      } catch (error) {
        console.log(`Warning: Could not auto-import participants: ${error.message}`);
      }
      
      // Create an embed for the tournament info
      const startTime = new Date(tournamentData.startAt * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const endTime = new Date(tournamentData.endAt * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const tournamentUrl = `https://start.gg/${formattedSlug}`;
      
      const embed = {
        color: 0x00AAFF,
        title: tournamentData.name,
        url: tournamentUrl,
        description: tournamentData.shortDescription || 'No description available.',
        fields: [
          {
            name: '📅 Date',
            value: tournamentData.startAt === tournamentData.endAt 
              ? startTime 
              : `${startTime} - ${endTime}`,
            inline: true
          },
          {
            name: '📍 Location',
            value: tournamentData.venueName || 'Online',
            inline: true
          },
          {
            name: '👥 Participants',
            value: tournamentData.numAttendees?.toString() || 'Unknown',
            inline: true
          }
        ],
        footer: {
          text: `Tournament ID: ${tournamentData.id}`
        },
        timestamp: new Date()
      };
      
      // Add events if available
      if (tournamentData.events && tournamentData.events.length > 0) {
        embed.fields.push({
          name: '🎮 Events',
          value: tournamentData.events.map(event => event.name).join('\n'),
          inline: false
        });
      }
      
      await loadingMessage.edit({ content: null, embeds: [embed] });
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      message.reply('There was an error accessing the Start.gg API. Please try again later.');
    }
  }
};
