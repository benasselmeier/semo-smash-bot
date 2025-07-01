const { getTournamentBySlug, getTournamentById, getRecentTournaments, autoImportParticipants } = require('../utils/startgg');

module.exports = {
  name: 'tournament-info',
  description: 'Get information about a Start.gg tournament or list upcoming tournaments',
  async execute(message, args) {
    try {
      // If no arguments, show recent tournaments
      if (args.length === 0) {
        const response = await getRecentTournaments(5);
        const tournaments = response.tournaments.nodes;
        
        if (tournaments.length === 0) {
          return message.reply('No upcoming tournaments found.');
        }
        
        const embed = {
          color: 0x6B52CC, // Start.gg purple
          title: '🏆 Upcoming Smash Tournaments',
          description: 'Here are the upcoming tournaments on Start.gg:',
          fields: tournaments.map(tournament => {
            const startDate = new Date(tournament.startAt * 1000).toLocaleDateString();
            return {
              name: tournament.name,
              value: `📅 ${startDate} | 👥 ${tournament.numAttendees || 'Unknown'} attendees\n[View on Start.gg](https://start.gg/${tournament.slug})`,
              inline: false
            };
          }),
          footer: {
            text: 'Data provided by start.gg'
          },
          timestamp: new Date()
        };
        
        return message.channel.send({ embeds: [embed] });
      }
      
      // Otherwise, get info for a specific tournament
      const tournamentInput = args.join(' ');
      const loadingMessage = await message.channel.send('Fetching tournament information from Start.gg...');
      
      try {
        let response;
        
        if (tournamentInput.startsWith('id:')) {
          // Process as tournament ID
          const tournamentId = tournamentInput.substring(3).trim();
          response = await getTournamentById(tournamentId);
        } else {
          // Process as tournament slug
          let slug = tournamentInput.toLowerCase();
          
          // Check if the input is a full URL or just a slug
          if (slug.includes('start.gg/')) {
            slug = slug.split('start.gg/')[1];
          } else if (slug.includes('smash.gg/')) {
            slug = slug.split('smash.gg/')[1];
          }
          
          response = await getTournamentBySlug(slug);
        }
        
        const tournament = response.tournament;
        
        if (!tournament) {
          return loadingMessage.edit(`Tournament not found. Make sure the slug or ID is correct. Examples:\n- By slug: \`!tournament-info tournament/genesis-9\`\n- By ID: \`!tournament-info id:12345\``);
        }
        
        // Format the start date
        const startDate = tournament.startAt 
          ? new Date(tournament.startAt * 1000).toLocaleDateString() 
          : 'Unknown';
        
        // Get the main event (usually the singles event)
        const mainEvent = tournament.events && tournament.events.length > 0 
          ? tournament.events[0] 
          : null;
        
        // Format top 8 if available
        let top8Text = 'No standings available yet';
        if (mainEvent && mainEvent.standings && mainEvent.standings.nodes.length > 0) {
          top8Text = mainEvent.standings.nodes
            .map(node => `${node.placement}. ${node.entrant.name}`)
            .join('\n');
        }
        
        const embed = {
          color: 0x6B52CC, // Start.gg purple
          title: tournament.name,
          url: `https://start.gg/${tournament.slug}`,
          description: `Tournament information from Start.gg`,
          fields: [
            {
              name: '📅 Date',
              value: startDate,
              inline: true
            },
            {
              name: '👥 Attendees',
              value: tournament.numAttendees ? tournament.numAttendees.toString() : 'Unknown',
              inline: true
            }
          ],
          footer: {
            text: 'Data provided by start.gg'
          },
          timestamp: new Date()
        };
        
        // Add event info if available
        if (mainEvent) {
          embed.fields.push({
            name: `🎮 ${mainEvent.name}`,
            value: `${mainEvent.numEntrants || 'Unknown'} entrants`,
            inline: false
          });
          
          // Add top 8 if available
          if (mainEvent.standings && mainEvent.standings.nodes.length > 0) {
            embed.fields.push({
              name: '🏅 Current Standings',
              value: top8Text,
              inline: false
            });
          }
        }
        
        await loadingMessage.delete();
        message.channel.send({ embeds: [embed] });
        
        // Automatically import tournament participants in the background
        try {
          // Start auto-import silently (don't need to return data)
          const importInput = tournamentInput.startsWith('id:') ? tournamentInput : slug;
          autoImportParticipants(importInput, true)
            .then(() => console.log(`Auto-imported players from tournament: ${tournament.name}`))
            .catch(err => console.error(`Error auto-importing players from ${tournament.name}:`, err));
        } catch (error) {
          console.error('Error starting auto-import:', error);
        }
      } catch (error) {
        loadingMessage.edit(`Error fetching tournament: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in tournament command:', error);
      message.reply('There was an error accessing the Start.gg API. Make sure your API key is properly configured in the .env file.');
    }
  }
};
