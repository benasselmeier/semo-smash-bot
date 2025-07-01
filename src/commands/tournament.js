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
      
      if (!tournamentData || !tournamentData.tournament) {
        return loadingMessage.edit(`Could not find tournament with slug: ${tournamentSlug}`);
      }
      
      const tournament = tournamentData.tournament;
      
      // Auto-import participants
      try {
        await autoImportParticipants(formattedSlug);
      } catch (error) {
        console.log(`Warning: Could not auto-import participants: ${error.message}`);
      }
      
      // Create an embed for the tournament info
      const startTime = new Date(tournament.startAt * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const endTime = new Date(tournament.endAt * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const tournamentUrl = `https://start.gg/${tournament.slug}`;
      
      const embed = {
        color: 0x00AAFF,
        title: tournament.name,
        url: tournamentUrl,
        description: tournament.shortDescription || 'No description available.',
        fields: [
          {
            name: '📅 Date',
            value: tournament.startAt === tournament.endAt 
              ? startTime 
              : `${startTime} - ${endTime}`,
            inline: true
          },
          {
            name: '📍 Location',
            value: tournament.venueName || 'Online',
            inline: true
          },
          {
            name: '👥 Participants',
            value: tournament.numAttendees?.toString() || 'Unknown',
            inline: true
          }
        ],
        footer: {
          text: `Tournament ID: ${tournament.id}`
        },
        timestamp: new Date()
      };
      
      // Add events if available
      if (tournament.events && tournament.events.length > 0) {
        // For each event, add name and entrant count
        embed.fields.push({
          name: '🎮 Events',
          value: tournament.events.map(event => {
            const entrantCount = event.numEntrants || 0;
            return `${event.name} (${entrantCount} entrants)`;
          }).join('\n'),
          inline: false
        });
        
        // Add top finishers if available
        for (const event of tournament.events) {
          if (event.standings && event.standings.nodes && event.standings.nodes.length > 0) {
            const topFinishers = event.standings.nodes
              .slice(0, 3) // Top 3 finishers
              .map(node => `${node.placement}. ${node.entrant.name}`)
              .join('\n');
              
            if (topFinishers) {
              embed.fields.push({
                name: `Top Finishers - ${event.name}`,
                value: topFinishers,
                inline: true
              });
            }
          }
        }
      }
      
      await loadingMessage.edit({ content: null, embeds: [embed] });
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      message.reply('There was an error accessing the Start.gg API. Please try again later.');
    }
  }
};
