# Event Type Reorganization - Four Categories

## New Event Type Structure

The tournament event system has been reorganized from 3 categories to 4 categories for better geographical organization:

### 🏠 **Local Events (SEMO)** - Green
- **Purpose**: Events organized by SEMO TOs
- **Target Audience**: Local SEMO community
- **TO Roles**: `TO (SEMO)`
- **Notification Roles**: `SEMO Enjoyer`
- **Color**: Green (`0x00ff00`)

### 🏛️ **Missouri Events** - Purple
- **Purpose**: Events organized by Missouri TOs (outside SEMO)
- **Target Audience**: Missouri smash community
- **TO Roles**: 
  - `TO (St. Louis)`
  - `TO (Jefferson City)`
  - `TO (CoMo)`
  - `TO (Kansas City)`
  - `TO (Springfield)`
  - `TO (Rolla)`
- **Notification Roles**: Respective enjoyer roles
- **Color**: Purple (`0x9932cc`)

### 🌍 **Out of State Events** - Orange
- **Purpose**: Events organized by TOs from other states
- **Target Audience**: Regional/national players
- **TO Roles**: Any TO role not explicitly mapped to local/missouri/online
- **Notification Roles**: Respective enjoyer roles
- **Color**: Orange (`0xff6b35`)

### 💻 **Online Events** - Blue
- **Purpose**: Online tournaments and events
- **Target Audience**: Online competitors
- **TO Roles**: `TO (Online)`
- **Notification Roles**: `Online Enjoyer`
- **Color**: Blue (`0x0099ff`)

## Implementation Changes

### 📋 **Constants Updated**
**File**: `src/config/constants.js`

```javascript
EVENT_TYPES: {
  LOCAL: 'local',
  MISSOURI: 'missouri',
  OUT_OF_STATE: 'out_of_state', 
  ONLINE: 'online'
}

EVENT_TYPE_MAPPINGS: {
  'TO (SEMO)': 'local',
  'TO (Online)': 'online',
  'TO (St. Louis)': 'missouri',
  'TO (Jefferson City)': 'missouri',
  'TO (CoMo)': 'missouri',
  'TO (Kansas City)': 'missouri',
  'TO (Springfield)': 'missouri',
  'TO (Rolla)': 'missouri'
}

EVENT_TYPE_LABELS: {
  local: '🏠 Local Events (SEMO)',
  missouri: '🏛️ Missouri Events',
  out_of_state: '🌍 Out of State Events',
  online: '💻 Online Events'
}

EVENT_TYPE_COLORS: {
  local: 0x00ff00,      // Green
  missouri: 0x9932cc,   // Purple
  out_of_state: 0xff6b35, // Orange
  online: 0x0099ff      // Blue
}
```

### 🔧 **ConfigManager Updated**
**File**: `src/utils/configManager.js`

- Updated fallback from `'out_of_region'` to `'out_of_state'`
- Maintains existing role-based event type detection
- New TO roles automatically map to Missouri Events

### 🎯 **Placeholder Creation Updated**
**File**: `src/handlers/buttonHandler.js`

- Now creates 4 placeholder messages instead of 3
- Maintains proper order: Local → Missouri → Out of State → Online
- Each placeholder has appropriate color coding

## Channel Organization

### 📢 **Announcement Channel Structure**
When setup is completed, the announcement channel will contain:

```
🏠 Local Events (SEMO) 🏠
[Green placeholder or active tournaments]

🏛️ Missouri Events 🏛️
[Purple placeholder or active tournaments]

🌍 Out of State Events 🌍
[Orange placeholder or active tournaments]

💻 Online Events 💻
[Blue placeholder or active tournaments]
```

## Benefits

### 🎯 **Better Organization**
- **Geographic Clarity**: Clear separation between local, state, and out-of-state
- **Relevant Grouping**: Missouri events grouped separately from other states
- **Logical Flow**: Natural progression from local to state to national to online

### 🎨 **Visual Distinction**
- **Color Coding**: Each category has distinct color for easy identification
- **Consistent Icons**: Recognizable emojis for each category
- **Professional Layout**: Clean, organized appearance

### 👥 **Community Benefits**
- **Targeted Notifications**: More precise role mentions
- **Easier Discovery**: Players can quickly find relevant events
- **Reduced Noise**: Better filtering of event types

## Migration Notes

### 🔄 **Existing Configurations**
- Existing guild configurations will continue to work
- Role mappings automatically update to new categories
- No manual migration required

### 📊 **Event Reassignment**
- **St. Louis events**: Move from "Out of Region" to "Missouri Events"
- **Other Missouri cities**: Move from "Out of Region" to "Missouri Events"
- **SEMO events**: Remain in "Local Events"
- **Online events**: Remain in "Online Events"

### 🚀 **New Setup Process**
- `/setup` command now creates 4 placeholder messages
- Existing functionality preserved
- Enhanced organization structure

## Testing Instructions

### 🧪 **To Test New Categories**

1. **Run Setup**: `/setup` to create new 4-category structure
2. **Test Local Events**: Use SEMO TO role to create tournament
3. **Test Missouri Events**: Use St. Louis TO role to create tournament  
4. **Test Out of State**: Use any unmapped TO role to create tournament
5. **Test Online Events**: Use Online TO role to create tournament

### ✅ **Expected Results**
- 4 distinct placeholder messages created
- Events post to correct categories based on TO role
- Color coding matches new scheme
- Proper consolidation within each category

## Files Modified

1. **`src/config/constants.js`** - Updated event types, mappings, labels, and colors
2. **`src/utils/configManager.js`** - Updated fallback from out_of_region to out_of_state
3. **`src/handlers/buttonHandler.js`** - Updated placeholder creation for 4 categories

## Future Enhancements

### 🔮 **Potential Improvements**
- **Custom Categories**: Allow servers to define custom event categories
- **Regional Groupings**: Support for other regional organizations
- **Time-based Categories**: Separate by tournament format or time periods
- **Skill-based Categories**: Separate by skill level or tournament type

The new four-category system provides better geographical organization while maintaining all existing functionality and smart consolidation features!
