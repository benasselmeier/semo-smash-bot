As a Tournament Organizer, I should be able to create a tournament with the `/tourney` command.

## Available Commands

### `/setup`
- **Administrator only** - Configure bot settings and permissions
- Sets up Tournament Organizer (TO) roles for your server
- Configures community "Enjoyer" notification roles  
- Designates management and announcement channels
- Required before using tournament features for the first time

### `/tourney create [slug]`
- Creates a tournament announcement directly with an optional Start.gg slug
- Example: `/tourney create kachow-kup`
- Example: `/tourney create https://start.gg/tournament/weekly-smash-1`
- If no slug is provided, the wizard will prompt for one
- **Event type is automatically determined by your TO role**

### `/tourney manage`
- Opens the full tournament management interface
- Provides options to create announcements or edit existing events

## Multi-Event Announcement System

The bot now intelligently groups events by type in consolidated announcement cards:

### **Event Types (Auto-Detected by Role):**
- 🏠 **Local Events (SEMO)** - Created by `TO (SEMO)` role holders
- 🌍 **Out of Region Events** - Created by other regional TO roles (`TO (St. Louis)`, `TO (CoMo)`, etc.)
- 💻 **Online Events** - Created by `TO (Online)` role holders

### **How It Works:**
1. **First Event**: Creates a new announcement card for that event type
2. **Additional Events**: Automatically adds to the existing card for that type
3. **Organization**: Each event type gets its own message/card in the announcement channel
4. **Notifications**: Role mentions are combined and additional pings sent for new events

### **Benefits:**
- **Organized Channel**: No spam - events are grouped logically
- **Clear Separation**: Easy to distinguish local vs regional vs online events  
- **Consolidated View**: Community sees all events of each type in one place
- **Smart Updates**: New events automatically added to existing cards

## Setup Process

Before tournament organizers can use the `/tourney` commands, an administrator must complete the initial setup:

1. **Run `/setup`** - Only administrators can use this command
2. **Configure TO Roles** - Select which roles can create tournaments
3. **Configure Enjoyer Roles** - Select which roles receive notifications
4. **Set Management Channel** - Where TOs will use `/tourney` commands
5. **Set Announcement Channel** - Where announcements will be posted
6. **Complete Setup** - Saves configuration and enables tournament features

### Configuration Persistence
- Setup configurations are saved automatically and persist until reconfigured
- Tournament announcements will always be posted to the designated announcement channel
- Permission checks use the configured TO roles
- Role notifications use the configured Enjoyer roles
- If no setup exists, the bot falls back to hardcoded role mappings for backwards compatibility

### Reconfiguration
- Run `/setup` again anytime to update the configuration
- Previous settings will be overwritten with new selections
- All tournament features continue working with the updated configuration

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
- **Edit Functionality**: Modify tournament details before posting

