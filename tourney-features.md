As a Tournament Organizer, I should be able to create a tournament with the `/tourney` command.

## Available Commands

### `/tourney create [slug]`
- Creates a tournament announcement directly with an optional Start.gg slug
- Example: `/tourney create kachow-kup`
- Example: `/tourney create https://start.gg/tournament/weekly-smash-1`
- If no slug is provided, the wizard will prompt for one

### `/tourney manage`
- Opens the full tournament management interface
- Provides options to create announcements or edit existing events

## Permission System

When the command is invoked, the bot should check the invoking user's roles to see if they are a part of any of the designated "TO" (Tournament Organizer) roles.

If the user is indeed part of a "TO" role, the tournament announcement they create will notify users with the corresponding "Enjoyer" role.

Our different TO and Enjoyer roles have the following designations:
- SEMO
- St. Louis
- Jefferson City
- CoMo
- Kansas City
- Springfield
- Rolla

## Features

- **Quick Creation**: Use `/tourney create slug` for fast tournament setup
- **Role Selection**: Choose which enjoyer roles to notify during confirmation
- **Start.gg Integration**: Automatic data import from Start.gg tournaments
- **Confirmation System**: Preview announcement before posting with role selection
- **Edit Functionality**: Modify tournament details before posting Organizer, I should be able to create a tournament with the !tourney command.


When the command is invoked, the the bot should check the invoking user's roles to see if they are a part of any of the designated "TO" (Tournament Organizer) roles.

If the user is indeed part of a "TO" role, the tournament announcement they create will notify users with the corresponding "Enjoyer" role.

Our different TO and Enjoyer roles have the following designations:
- SEMO
- St. Louis
- Jefferson City
- CoMo
- Kansas City
- Springfield
- Rolla

