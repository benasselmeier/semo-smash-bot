// Test script for import command
const { queryStartGG } = require('./src/utils/startgg');

async function testImport() {
  try {
    const { gql } = await import('graphql-request');
    
    console.log('Testing direct event bracket query...');
    
    // Let's directly test the event bracket query with a known eventId
    // Using a sample eventId (this is just an example and may not be valid)
    const eventId = 663322; // Replace with a known event ID if you have one
    
    console.log(`Looking up event with ID: ${eventId}`);
    
    // Test the bracket query with a direct event ID
    const bracketQuery = gql`
      query EventBracket($eventId: ID!) {
        event(id: $eventId) {
          id
          name
          slug
          tournament {
            name
          }
          sets(page: 1, perPage: 3) {
            nodes {
              id
              displayScore
              winnerId
              slots {
                entrant {
                  id
                  name
                }
              }
              games {
                selections {
                  entrant {
                    id
                  }
                  character {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    console.log('Executing GraphQL query...');
    
    if (!tournamentData.tournament || !tournamentData.tournament.events || !tournamentData.tournament.events.length) {
      console.log('No events found in tournament');
      return;
    }
    
    const event = tournamentData.tournament.events[0];
    console.log(`Testing with event: ${event.name} (ID: ${event.id})`);
    
    // Now test the bracket query with this event ID
    const bracketQuery = gql`
      query EventBracket($eventId: ID!) {
        event(id: $eventId) {
          id
          name
          sets(page: 1, perPage: 3) {
            nodes {
              id
              displayScore
              winnerId
              slots {
                entrant {
                  id
                  name
                }
              }
              games {
                selections {
                  entrant {
                    id
                  }
                  character {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const bracketData = await queryStartGG(bracketQuery, { eventId: event.id });
    console.log('Event bracket data fetched successfully');
    
    if (bracketData.event && bracketData.event.sets && bracketData.event.sets.nodes) {
      console.log(`Found ${bracketData.event.sets.nodes.length} sets`);
      
      // Check if we have any character data
      let hasCharacterData = false;
      for (const set of bracketData.event.sets.nodes) {
        if (set.games && set.games.length > 0) {
          for (const game of set.games) {
            if (game.selections && game.selections.length > 0) {
              hasCharacterData = true;
              console.log('Character data found in set:', 
                game.selections.map(s => s.character?.name).filter(Boolean));
              break;
            }
          }
          if (hasCharacterData) break;
        }
      }
      
      if (!hasCharacterData) {
        console.log('No character data found in the fetched sets');
      }
    } else {
      console.log('No sets found in the event');
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error testing import:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL errors:', error.response.errors.map(e => e.message).join(', '));
    }
  }
}

testImport();
