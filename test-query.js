// Test script for GraphQL query
const { queryStartGG } = require('./src/utils/startgg');

async function test() {
  // Dynamically import graphql-request
  const { gql } = await import('graphql-request');
  try {
    const query = gql`
      query EventBracketTest($eventId: ID!) {
        event(id: $eventId) {
          id
          name
          sets(page: 1, perPage: 5) {
            nodes {
              id
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
    
    console.log('Testing query...');
    const result = await queryStartGG(query, { eventId: '1234' });
    console.log('Query successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing query:', error.message);
    if (error.response && error.response.errors) {
      console.error('GraphQL errors:', error.response.errors.map(e => e.message).join(', '));
    }
  }
}

test();
