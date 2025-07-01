# Troubleshooting

## Common Issues

### Error: Used disallowed intents

If you encounter this error when starting the bot:
```
Error logging in: Error: Used disallowed intents
```

This means you need to enable the required privileged intents in the Discord Developer Portal:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to the "Bot" tab
4. Scroll down to "Privileged Gateway Intents"
5. Enable the toggle for "MESSAGE CONTENT INTENT"
6. Click "Save Changes"

### Error: require() of ES Module

If you encounter this error related to graphql-request:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported.
Instead change the require of main.js ... to a dynamic import() which is available in all CommonJS modules.
```

This is due to the graphql-request package being an ES Module. The code has been updated to use dynamic imports, but if you're still experiencing issues:

1. Make sure you're using the latest version of the code
2. Check that you have Node.js version 14.16.0 or higher installed
3. Try running the commands:
   ```bash
   npm uninstall graphql-request
   npm install graphql-request
   ```

### Discord API errors

If you encounter errors related to the Discord API:

1. Check that your bot token is correct in the `.env` file
2. Verify that your bot has been added to your server with the correct permissions
3. Make sure the bot's intents are properly configured in the Discord Developer Portal
4. Try regenerating your bot token if all else fails

## Start.gg Integration Issues

If you're having trouble with the Start.gg integration:

1. Verify that your Start.gg API key is correct in the `.env` file
2. Check that you're using the correct tournament slug format (e.g., `tournament/tournament-name`)
3. Make sure the tournament exists and is public
4. Remember that some tournaments might have restrictions on API access

### Error: Cannot query field 'selections' on type 'SetSlot'

If you encounter this error when using the `!import` command:

```
GraphQL API Error: Cannot query field 'selections' on type 'SetSlot'
```

This error occurs because the Start.gg API schema has changed and no longer provides character selection data directly on set slots. The bot has been updated to handle this by:

1. Only querying character data from the `games` array in each set
2. Skipping character data if it's not available in a tournament
3. Properly handling API responses without selection data

If you encounter this error:
1. Make sure you're using the latest version of the bot
2. Update the import command code if needed
3. Be aware that character data may be limited or unavailable for some tournaments

### Error: Your query complexity is too high

If you encounter this error when using the `!import` command:

```
GraphQL API Error: Your query complexity is too high. A maximum of 1000 objects may be returned by each request.
```

This error occurs because Start.gg's API limits the amount of data that can be fetched in a single request. The bot has been updated to handle this by:

1. Using pagination to fetch data in smaller chunks
2. Reducing the page size from 100 to 15 sets per request
3. Limiting the total number of sets fetched per event to 300
4. Adding delays between API requests to avoid rate limiting

If you still encounter this error:
1. Try using the `!import-singles` command which only imports singles events and uses an even smaller page size (3-5 sets per page)
2. Import a smaller tournament first
3. Consider modifying the `perPage` variable in the `fetchEventBracketWithCharacters` function to a smaller value (e.g., 5)
4. You can also adjust the maximum number of sets per event (default: 300)

## Advanced Troubleshooting

### Testing with Smaller Tournaments

If you're encountering issues with very large tournaments, try testing with smaller tournaments first:

1. Find a smaller tournament on Start.gg (ideally with fewer than 100 participants)
2. Use the `!import` command with the smaller tournament slug
3. Verify that the import works correctly
4. If it works, you can try importing the larger tournament again

### Modifying Import Parameters

Advanced users can modify the following parameters in the `import_new.js` file to optimize imports:

```javascript
// Pagination settings in fetchEventBracketWithCharacters function
const perPage = 15; // Reduce this number for lower query complexity
```

```javascript
// Maximum sets per event
if (allSets.length > 300) {
  console.log(`Reached maximum of 300 sets, stopping pagination to avoid query complexity issues`);
  hasMorePages = false;
}
```

Try reducing these values if you're still encountering complexity errors.

### Debugging Import Issues

For debugging import problems:

1. Create a test script based on `test-import-command.js`
2. Replace the event ID with a real event ID from your tournament
3. Run the script with `node test-import-command.js`
4. Check the console output for detailed error messages

#### Finding Event IDs

To find an event ID:
1. Open the tournament page on Start.gg
2. Click on an event
3. The event ID is in the URL after `/event/`: `https://start.gg/tournament/example/event/12345`
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
  const result = await queryStartGG(query, { eventId: '12345' }); // Use a real event ID
  console.log('Query successful!');
  console.log(JSON.stringify(result, null, 2));
}

test();
```

Run it with: `node test-query.js`

## Bracket Command Pagination Issues

If you're experiencing issues with the bracket command's pagination system:

### Reactions not working

If clicking on reactions doesn't change the bracket display:

1. Make sure the bot has the `MANAGE_MESSAGES` permission to remove user reactions
2. Check that the bot is using the proper intents (`GUILD_MESSAGE_REACTIONS` and `GUILD_MESSAGES`)
3. Verify that the message is still within the 5-minute reaction collection window
4. Try using the command again if the collection period has ended

### Bracket data not displaying correctly

If bracket information is incomplete or incorrect:

1. Verify that the tournament has public bracket data available on Start.gg
2. Check that you're using the correct tournament slug
3. Make sure the event index is correct (remember it's 1-based in the command but 0-based internally)
4. Some tournaments may have limited API access or incomplete data

### Navigation showing incorrect pages

If the navigation doesn't display the expected tournament phases or rounds:

1. The tournament might not have multiple phases set up on Start.gg
2. Small tournaments might only have a single phase with few rounds
3. Try specifying a different event index if the tournament has multiple events

### Console errors related to pagination

If you see errors in the console related to the bracket pagination:

```
Error handling bracket reaction: TypeError: Cannot read properties of undefined
```

This usually indicates a mismatch between the stored pagination data and what's being accessed. Try:

1. Restarting the bot to clear any cached pagination data
2. Using the command again to generate fresh pagination data
3. Checking the logs for more specific error information

## Need More Help?

If you're still experiencing issues:

1. Check the console output for specific error messages
2. Make sure all required dependencies are installed by running `npm install`
3. Try restarting the bot with `npm start`
4. Check the Discord.js documentation for any recent changes to the API
