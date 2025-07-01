# Mother Brain - Smash Community Leaderboard Bot

A Discord bot designed to track rankings and manage leaderboards for a Smash Bros community. The name "Mother Brain" is a playful reference to the main antagonist from the Metroid series.

## Features

- Player registration system
- Match reporting and tracking
- Flexible ranking system with multiple algorithms (ELO, TrueSkill)
- Season-based leaderboards with tournament tracking
- Automatic tournament match import for season rankings
- Head-to-head player records
- Match history tracking
- Role-based permissions for tournament organizers and moderators
- Start.gg (smash.gg) integration for tournament data and match results
- Automatic player data import from tournaments

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the example and add your Discord bot token:
   ```
   DISCORD_TOKEN=your_discord_token_here
   PREFIX=!
   CLIENT_ID=your_application_id_here
   STARTGG_API_KEY=your_startgg_api_key_here
   ```
4. Initialize the data storage:
   ```
   npm run init
   ```
5. Start the bot:
   ```
   npm start
   ```

## Getting a Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" tab
4. Click "Add Bot"
5. Under the token section, click "Reset Token" to get your token
6. Paste the token in your `.env` file
7. **Important**: Enable the "Message Content Intent" in the Bot settings
   - In the Bot tab, scroll down to "Privileged Gateway Intents"
   - Enable the toggle for "MESSAGE CONTENT INTENT"
   - Click "Save Changes"

## Inviting the Bot to Your Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to the "OAuth2" tab, then "URL Generator"
4. Select the "bot" scope and appropriate permissions (at minimum: "Send Messages", "Read Messages/View Channels")
5. Copy the generated URL and open it in a browser
6. Select the server you want to add the bot to and confirm

## Getting a Start.gg API Key

For Start.gg integration features:

1. Go to the [Start.gg Developer Portal](https://developer.start.gg/docs/authentication)
2. Log in with your Start.gg account
3. Navigate to "Applications" and create a new application
4. Generate a new API key
5. Add the API key to your .env file as `STARTGG_API_KEY`

## Start.gg Integration

The bot integrates with the Start.gg API to import tournament data and match results automatically.

### Auto-Import Features
- `!import [tournament-slug]` - Import all matches from a tournament
- `!import-singles [tournament-slug]` - Import only singles matches from a tournament (lower complexity)
- `!tournament-info [tournament-slug]` - Get basic information about a tournament
- `!bracket [tournament-slug] [event-index]` - Show bracket paths for top 8 players

### Known Limitations

- **Character Data**: Due to Start.gg API limitations, character selections are not always available. The bot will still import matches, but character data may be missing.
- **Query Complexity**: The Start.gg API has a limit on query complexity. For very large tournaments, the bot may only import a portion of the matches (up to 300 sets per event).
- **Rate Limiting**: To avoid hitting API rate limits, the bot adds delays between requests and may take longer to import large tournaments.

If you encounter issues with the Start.gg integration, check the [Troubleshooting](#troubleshooting) section.

## Commands

### General Commands
- `!tournament [short-slug]` - Look up a tournament by short slug
- `!bracket [tournament-slug] [event-index]` - Show the bracket path for a tournament event with interactive navigation
- `!smasher [player-tag]` - Look up a Smash player by tag
- `!pr [season-id]` - Show the current power rankings or a past season
- `!season` - Show information about the current SEMO smash season
- `!h2h [player1] [player2]` - View head-to-head record between two players

### Moderator Commands
- `!season add [tournament-slug]` - Add a tournament to the current season
- `!season remove [tournament-slug]` - Remove a tournament from the current season
- `!season create [name]` - Create a new season
- `!season end` - End the current season
- `!import [tournament-slug]` - Import all matches from a tournament bracket
- `!import-tournament-matches [tournament-slug]` - Manually import matches from a tournament
- `!report "[winner]" "[loser]" "[score]" "[tournament]"` - Report a match result
- `!ranking-system [system]` - Change the ranking system (elo/trueskill)

## Ranking Systems

The bot supports multiple ranking algorithms that can be switched between by moderators:

### ELO System (Default)
- Traditional chess-style rating system
- Each player has a single numerical rating (default: 1000)
- Rating changes based on expected outcome vs actual outcome
- Higher-rated players gain less for beating lower-rated opponents
- K-factor adjusts based on player experience and tournament importance

### TrueSkill System
- Modern Bayesian skill rating system developed by Microsoft
- Each player has a mean (μ) and standard deviation (σ) rating
- Better at determining skill with fewer matches
- Takes uncertainty into account for more accurate matchmaking
- Conservative rating (μ - 3σ) used for rankings to reward consistency

To change the ranking system, moderators can use:
```
!ranking-system elo
```
or 
```
!ranking-system trueskill
```

## Season System

The bot includes a comprehensive season system for tracking tournaments and player performance:

### Season Features
- Track tournaments that are part of the current season
- Automatically import tournament matches from Start.gg
- Record player results and head-to-head records within seasons
- Calculate season-specific power rankings
- Archive past seasons with their final rankings
- Season-based leaderboards that consider:
  - Win percentage
  - Strength of schedule (average opponent rating)
  - Head-to-head records
  - Tournament performance

Moderators can manage seasons with the following commands:
```
!season create "Season Name"  # Start a new season
!season add tournament-slug   # Add a tournament to the current season
!season remove tournament-slug # Remove a tournament from the current season
!season end                   # End the current season and archive it
```

### Viewing Season Data
```
!season                      # View current season info
!pr                          # View current season rankings
!pr season-id                # View rankings from a past season
!h2h player1 player2         # View head-to-head record between players
```

## Bracket Command

The `!bracket` command lets you view tournament bracket paths and match results from Start.gg tournaments.

#### Usage
```
!bracket [tournament-slug] [event-index]
```

Examples:
- `!bracket genesis-9` - Shows bracket for the first event
- `!bracket genesis-9 2` - Shows bracket for the second event
- `!bracket underground-smash-5` - Shows bracket for Underground Smash 5

#### Interactive Navigation
The bracket command now supports interactive navigation with reaction-based pagination:

- Use the ⬅️ and ➡️ reactions to navigate through:
  - Different phases of the tournament (pools, top 64, top 8, etc.)
  - Different rounds within each phase (winners round 1, losers round 2, etc.)
- Each page shows up to 3 rounds at a time with up to 5 matches per round
- Navigation automatically removes user reactions to keep the message clean
- The navigation is active for 5 minutes after the command is used

## Automatic Player Import

This bot automatically imports player data from Start.gg tournaments when you look them up. This feature works as follows:

1. When a tournament is looked up using `!tournament [short-slug]`, all participants are automatically imported into the bot's database
2. Players who have already registered via Discord will keep their existing data
3. New players are added with their Start.gg information
4. When a player registers with `!register` and their tag matches a previously imported player, their Discord account gets linked to that data
5. All match history and statistics are preserved when linking accounts

This system allows for seamless tracking of players even before they register with the bot directly, creating a more complete leaderboard from the start.

To see statistics about the auto-import system, use the `!auto-import-info` command.

## Tournament Import

The bot can automatically import all match data from a Start.gg tournament bracket using the `!import` command.

### Import Command

```
!import [tournament-slug]
```

When used, this command will:

1. Fetch the tournament data from Start.gg
2. Process all events in the tournament
3. Import match data including:
   - Players involved in each match
   - Match results and scores
   - Tournament round information
   - Character data (when available from games)
   - Date and tournament metadata

### Import Features

- **Automatic Player Creation**: New players found in imported tournaments are automatically added to the database
- **Match Deduplication**: The system prevents duplicate imports of the same match
- **Complete Tournament Data**: All matches across all events in a tournament are imported
- **Character Tracking**: When available, the bot tracks which characters players used in matches
- **Detailed Import Statistics**: After import, a summary shows how many matches were processed
- **Season Integration**: Use `!season add [tournament-slug]` after importing to add the tournament to the current season

### Start.gg API Limitations

Please note that character data availability depends on the tournament setup in Start.gg:
- Character data is only available if the tournament organizers enabled character selection in the bracket
- The bot can only access character data from recorded games within each set
- Some tournaments may not have character data available at all
- Due to Start.gg API limitations, character data is only available from the `games` array, not directly from set slots

If character data is missing, the import will still work but character information will be empty.

After importing a tournament, you can view player records and match history using the `!smasher` and `!h2h` commands.

## Development

To run the bot in development mode with auto-restart on file changes:

```
npm run dev
```

## Troubleshooting

If you encounter any issues while setting up or running the bot, please check the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file for common problems and solutions.

Common issues with the `!import` command include:
- **Query complexity errors**: For large tournaments, try reducing the page size or maximum sets
- **Character data limitations**: Not all tournaments have character selection data available
- **API rate limiting**: Add delays between requests to avoid hitting rate limits

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

## License

ISC
