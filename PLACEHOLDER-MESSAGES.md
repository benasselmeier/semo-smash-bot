# Placeholder Messages Feature

## Overview
Added automatic placeholder message creation during setup completion to provide organized structure in the announcement channel.

## Feature Description

### 🎯 **Placeholder Message Creation**
When `/setup` is completed successfully, the bot automatically creates three placeholder messages in the announcement channel:

1. **🎮 Local Events (SEMO) 🎮** - Green color
2. **🎮 Out of Region Events 🎮** - Orange color  
3. **🎮 Online Events 🎮** - Blue color

### 📋 **Placeholder Content**
Each placeholder message contains:
- **Header**: Event type label with emoji
- **Embed**: "No tournaments currently scheduled. Check back later for updates!"
- **Color**: Matches the event type color scheme
- **Footer**: "This message will update automatically when tournaments are added."
- **Timestamp**: Shows when the placeholder was created

### 🔄 **Smart Placeholder Behavior**

#### **First Tournament Added**
When the first tournament is added to an event type:
- Placeholder content is replaced with tournament details
- Role mentions are added to notify community members
- Message transforms from placeholder to active announcement

#### **Additional Tournaments**
When more tournaments are added:
- Existing tournament content is preserved
- New tournaments are appended to the multi-event card
- Role mentions are added for new notifications

#### **Tournament Expiration**
When tournaments expire (24 hours old):
- Messages are reset back to placeholder content
- Structure is maintained for future tournaments
- No messages are deleted, ensuring consistent organization

### 🛠️ **Technical Implementation**

#### **Setup Integration**
**File**: `src/handlers/buttonHandler.js`
- Added `createPlaceholderMessages()` function
- Called automatically after setup completion
- Creates messages in specified announcement channel

#### **Placeholder Tracking**
**File**: `src/utils/configManager.js`
- Added `isPlaceholder` flag to announcement data
- Tracks placeholder state vs active tournament state
- Maintains client reference for cleanup operations

#### **Multi-Event Handler Updates**
**File**: `src/handlers/multiEventHandler.js`
- Updated to handle placeholder replacement
- Smart detection of placeholder vs active announcements
- Automatic reset to placeholder when tournaments expire

### 📊 **Message Structure**

#### **Placeholder Message Format**
```
🎮 **Local Events (SEMO)** 🎮

[Embed Content]
No tournaments currently scheduled. Check back later for updates!

This message will update automatically when tournaments are added.
```

#### **Active Tournament Message Format**
```
🎮 **Local Events (SEMO)** 🎮

@SEMO Enjoyer - New tournament(s) announced!

[Embed Content]
🏆 Tournament Name
📅 Start Time: [Time]
🎮 Events: [Events]
📍 Address: [Address]
👤 TO Contact: [Contact]
🔗 Registration: [Link]
```

### 🎨 **Visual Organization**

#### **Channel Structure**
The announcement channel will always have a consistent structure:
1. **Local Events** (Top) - Green
2. **Out of Region Events** (Middle) - Orange
3. **Online Events** (Bottom) - Blue

#### **Benefits**
- **Consistent Layout**: Always organized the same way
- **Easy Navigation**: Users know where to find event types
- **Professional Appearance**: Clean, structured channel
- **No Empty Channels**: Always has content, even when no tournaments

### 🔧 **Setup Process**

#### **Automatic Creation**
1. Administrator runs `/setup` command
2. Completes 4-step configuration process
3. Bot automatically creates placeholder messages
4. Messages are tracked in memory for future updates

#### **No Manual Intervention**
- No need to manually create structure
- No need to manage message organization
- Automatic maintenance and cleanup

### 🚀 **Usage Examples**

#### **Fresh Setup**
```
Setup complete! ✅

Channel now contains:
🎮 Local Events (SEMO) 🎮 - No tournaments scheduled
🎮 Out of Region Events 🎮 - No tournaments scheduled  
🎮 Online Events 🎮 - No tournaments scheduled
```

#### **After Adding Tournaments**
```
🎮 Local Events (SEMO) 🎮 
└── 2 tournaments active

🎮 Out of Region Events 🎮
└── 1 tournament active

🎮 Online Events 🎮
└── No tournaments scheduled
```

### 💡 **Benefits**

#### **For Administrators**
- **Zero Setup**: Automatic organization structure
- **Consistent Layout**: Professional appearance
- **Easy Management**: No manual message creation needed

#### **For Community Members**
- **Predictable Layout**: Always know where to find events
- **Clear Organization**: Event types clearly separated
- **Never Empty**: Always has content and structure

#### **For Tournament Organizers**
- **Automatic Placement**: Tournaments go to correct spots
- **Visual Feedback**: Clear where announcements will appear
- **Consistent Experience**: Same structure across all servers

### 🔄 **Maintenance**

#### **Automatic Cleanup**
- Runs every 6 hours to check for expired tournaments
- Resets expired announcements back to placeholder content
- Maintains consistent channel structure

#### **Persistent Structure**
- Placeholders are never deleted
- Channel structure is maintained indefinitely
- New tournaments automatically use existing structure

### 📈 **Future Enhancements**

#### **Potential Improvements**
- Database persistence for placeholders
- Custom placeholder messages per server
- Additional event type categories
- Placeholder message customization options

## Files Modified

1. **`src/handlers/buttonHandler.js`**
   - Added `createPlaceholderMessages()` function
   - Integrated with setup completion workflow

2. **`src/utils/configManager.js`**
   - Added `setClient()` method for cleanup operations
   - Enhanced announcement tracking with `isPlaceholder` flag

3. **`src/handlers/multiEventHandler.js`**
   - Updated `updateExistingAnnouncement()` to handle placeholders
   - Added `resetToPlaceholder()` method for cleanup
   - Enhanced `cleanupOldAnnouncements()` to reset vs delete

4. **`index.js`**
   - Added client reference setup for configManager
   - Integrated placeholder system with main bot lifecycle

## Testing Status

✅ **Bot Startup** - Successfully integrated placeholder system  
✅ **Code Validation** - All files pass syntax checks  
✅ **Setup Integration** - Placeholder creation on setup completion  
✅ **Ready for Testing** - Complete placeholder system ready for use  

The placeholder message system provides automatic organization structure that maintains consistency and professionalism in tournament announcement channels!
