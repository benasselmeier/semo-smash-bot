// Direct test script for event bracket query
const { queryStartGG } = require('./src/utils/startgg');

async function testDirectEventQuery() {
  try {
    const { gql } = await import('graphql-request');
    
    console.log('Testing direct event bracket query...');
    
    // Using a known event ID from a recent tournament
    // This is a different event ID
    const eventId = 1110995; 
    
    console.log(`Looking up event with ID: ${eventId}`);
    
    // Modified query to get more details and filter for completed sets
    const eventQuery = gql`
      query EventBracket($eventId: ID!) {
        event(id: $eventId) {
          id
          name
          slug
          tournament {
            name
          }
          sets(
            page: 1, 
            perPage: 5,
            filters: {
              state: [1, 2, 3]  # 1=IN_PROGRESS, 2=COMPLETED, 3=CALLED
            }
          ) {
            nodes {
              id
              displayScore
              winnerId
              completedAt
              state # 1=IN_PROGRESS, 2=COMPLETED, 3=CALLED
              slots {
                entrant {
                  id
                  name
                  participants {
                    player {
                      id
                      gamerTag
                    }
                  }
                }
              }
              games {
                id
                winnerId
                stage {
                  name
                }
                selections {
                  entrant {
                    id
                  }
                  character {
                    id
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
    const eventData = await queryStartGG(eventQuery, { eventId });
    console.log('Event data:', JSON.stringify(eventData, null, 2));
    
    if (eventData.event && eventData.event.sets && eventData.event.sets.nodes) {
      console.log(`Found ${eventData.event.sets.nodes.length} sets`);
      
      // Check if we have any character data
      let hasCharacterData = false;
      for (const set of eventData.event.sets.nodes) {
        console.log(`Set ID: ${set.id}, State: ${set.state}, Has games: ${set.games ? 'Yes' : 'No'}`);
        
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
    console.error('Error testing event query:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL errors:', error.response.errors.map(e => e.message).join(', '));
    }
  }
}

testDirectEventQuery();
