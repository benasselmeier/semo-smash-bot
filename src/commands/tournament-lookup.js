const { getTournamentById, getTournamentBySlug, autoImportParticipants } = require('../utils/startgg');

module.exports = {
  name: 'tournament-lookup',
  description: 'Get information about a Start.gg tournament by ID or slug',
  async execute(message, args) {
    if (args.length < 1) {
      return message.reply('Usage:\n- By slug: `!tournament-lookup tournament/genesis-9`\n- By ID: `!tournament-lookup id:12345`');
    }
    
    try {
      // Parse tournament slug or ID
      const tournamentInput = args.join(' ');
      
      // Notify user we're fetching data
      const loadingMessage = await message.channel.send('Fetching tournament data...');
      
      let tournamentData;
      
      if (tournamentInput.startsWith('id:')) {
        // Process as tournament ID
        const tournamentId = tournamentInput.substring(3).trim();
        try {
          tournamentData = await getTournamentById(tournamentId);
        } catch (error) {
          return loadingMessage.edit(`Error: ${error.message}. Make sure the tournament ID is valid.`);
        }
      } else {
        // Process as tournament slug
        let slug = tournamentInput.toLowerCase();
        
        // Check if the input is a full URL or just a slug
        if (slug.includes('start.gg/')) {
          slug = slug.split('start.gg/')[1];
        } else if (slug.includes('smash.gg/')) {
          slug = slug.split('smash.gg/')[1];
        }
        
        try {
          tournamentData = await getTournamentBySlug(slug);
        } catch (error) {
          return loadingMessage.edit(`Error: ${error.message}. Make sure the tournament slug is valid.`);
        }
      }
      
      if (!tournamentData.tournament) {
        return loadingMessage.edit('Tournament not found.');
      }
      
      const tournament = tournamentData.tournament;
      
      // Format dates
      const startDate = tournament.startAt ? new Date(tournament.startAt * 1000).toLocaleDateString() : 'N/A';
      const endDate = tournament.endAt ? new Date(tournament.endAt * 1000).toLocaleDateString() : 'N/A';
      
      // Count events per game
      const gameEvents = {};
      for (const event of tournament.events || []) {
        const gameName = event.videogame?.name || 'Unknown Game';
        if (!gameEvents[gameName]) {
          gameEvents[gameName] = [];
        }
        gameEvents[gameName].push(event);
      }
      
      // Create fields for each game
      const eventFields = Object.entries(gameEvents).map(([gameName, events]) => {
        return {
          name: gameName,
          value: events.map(e => `${e.name}: **${e.numEntrants || 0}** entrants`).join('\n'),
          inline: true
        };
      });
      
      // Create embed
      const embed = {
        color: 0x3498DB,
        title: tournament.name,
        url: `https://start.gg/${tournament.slug}`,
        description: `ID: **${tournament.id}**`,
        fields: [
          {
            name: 'Date',
            value: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
            inline: true
          },
          {
            name: 'Attendees',
            value: tournament.numAttendees ? tournament.numAttendees.toString() : 'N/A',
            inline: true
          },
          {
            name: 'Slug',
            value: tournament.slug,
            inline: true
          },
          ...eventFields
        ],
        footer: {
          text: 'Import players with !import-players id:' + tournament.id
        },
        timestamp: new Date()
      };
      
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
      console.error('Error in tournament-lookup command:', error);
      message.reply('There was an error accessing the Start.gg API. Make sure your API key is properly configured.');
    }
  }
};
