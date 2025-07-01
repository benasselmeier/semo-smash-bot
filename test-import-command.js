// Test script for the import command with reduced query complexity
// This script can be used to test the import functionality separately
require('dotenv').config();
const { queryStartGG } = require('./src/utils/startgg');

async function testImportCommand() {
  try {
    // Dynamically import graphql-request
    const { gql } = await import('graphql-request');
    
    // Replace with a real event ID for testing
    const eventId = '1234567'; // Replace with an actual event ID
    
    console.log('Testing import command with reduced query complexity...');
    
    // Get all sets using pagination
    let allSets = [];
    let page = 1;
    const perPage = 15; // Reduced page size to lower query complexity
    let hasMorePages = true;
    let result = null;
    
    while (hasMorePages && page <= 3) { // Limit to 3 pages for testing
      const query = gql`
        query EventBracketTest($eventId: ID!, $page: Int!, $perPage: Int!) {
          event(id: $eventId) {
            id
            name
            slug
            sets(
              page: $page
              perPage: $perPage
              sortType: ROUND
            ) {
              pageInfo {
                total
                totalPages
                page
                perPage
                hasNextPage
              }
              nodes {
                id
                round
                fullRoundText
                displayScore
                winnerId
                slots {
                  entrant {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;
      
      const variables = {
        eventId,
        page,
        perPage
      };
      
      console.log(`Fetching event data, page ${page}...`);
      result = await queryStartGG(query, variables);
      
      // Check if we have a valid event and sets
      if (!result.event) {
        throw new Error('Event not found');
      }
      
      // Add sets from this page to our collection
      if (result.event.sets && result.event.sets.nodes) {
        const pageSetCount = result.event.sets.nodes.length;
        allSets = [...allSets, ...result.event.sets.nodes];
        
        console.log(`Page ${page}: Found ${pageSetCount} sets. Total: ${allSets.length}`);
        console.log(`Page Info: ${JSON.stringify(result.event.sets.pageInfo)}`);
        
        // Check if there are more pages
        hasMorePages = result.event.sets.pageInfo.hasNextPage;
        
        // Increment page number for next request
        page++;
        
        // Add a delay between requests to avoid rate limits
        if (hasMorePages) {
          console.log('Waiting 2 seconds before next request...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        hasMorePages = false;
      }
    }
    
    console.log(`Test completed. Fetched a total of ${allSets.length} sets`);
    
    // Display a sample of what we got
    if (allSets.length > 0) {
      console.log('Sample set data:');
      console.log(JSON.stringify(allSets[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error in test:', error);
    
    // Check for GraphQL-specific errors
    if (error.response && error.response.errors) {
      const graphqlErrors = error.response.errors.map(e => e.message).join(', ');
      console.error(`GraphQL API Error: ${graphqlErrors}`);
    }
  }
}

// Run the test
testImportCommand();
