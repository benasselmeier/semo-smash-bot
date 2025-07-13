require('dotenv').config();
const { STARTGG_API_URL } = require('../config/constants');

class StartGGClient {
  constructor() {
    this.token = process.env.STARTGG_API_KEY;
    if (!this.token) {
      console.warn('Warning: STARTGG_API_KEY environment variable is not set');
    }
  }

  async fetchTournamentData(slug) {
    const query = `
      query TournamentQuery($slug: String!) {
        tournament(slug: $slug) {
          id
          name
          slug
          startAt
          endAt
          timezone
          venueName
          venueAddress
          lat
          lng
          events {
            id
            name
            slug
            entrantSizeMin
            entrantSizeMax
          }
          images {
            url
            type
          }
          links {
            facebook
            discord
          }
          rules
          registrationClosesAt
          isRegistrationOpen
          numAttendees
          admins {
            id
            player {
              gamerTag
            }
          }
        }
      }
    `;

    try {
      if (!this.token) {
        console.error('Start.gg API key is not configured');
        return null;
      }

      const response = await fetch(STARTGG_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          query,
          variables: { slug }
        })
      });

      if (!response.ok) {
        console.error('Start.gg API HTTP error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      // Log the full response for debugging
      console.log('Start.gg API Response:', JSON.stringify(data, null, 2));
      
      if (data.errors) {
        console.error('Start.gg API errors:', data.errors);
        return null;
      }

      // Check if data.data exists before accessing tournament
      if (!data.data) {
        console.error('Start.gg API response missing data field:', data);
        return null;
      }

      return data.data.tournament;
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      return null;
    }
  }

  formatTournamentData(tournament) {
    const startDate = new Date(tournament.startAt * 1000);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const events = tournament.events.map(event => event.name).join(', ');
    
    // Get admin contact info
    let toContact = 'Contact via Start.gg';
    if (tournament.admins && tournament.admins.length > 0) {
      const admin = tournament.admins[0];
      if (admin.player && admin.player.gamerTag) {
        toContact = `${admin.player.gamerTag} (Start.gg)`;
      }
    }

    return {
      eventName: tournament.name,
      startTime: formattedDate,
      events: events || 'Not specified',
      address: tournament.venueAddress || tournament.venueName || 'Address not specified',
      toContact: toContact,
      numAttendees: tournament.numAttendees || 0,
      registrationOpen: tournament.isRegistrationOpen
    };
  }
}

module.exports = new StartGGClient();