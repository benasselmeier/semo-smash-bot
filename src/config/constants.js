module.exports = {
  ROLE_MAPPINGS: {
    'TO (SEMO)': 'SEMO Enjoyer',
    'TO (St. Louis)': 'St. Louis Enjoyer',
    'TO (Jefferson City)': 'Jefferson City Enjoyer',
    'TO (CoMo)': 'CoMo Enjoyer',
    'TO (Kansas City)': 'Kansas City Enjoyer',
    'TO (Springfield)': 'Springfield Enjoyer',
    'TO (Rolla)': 'Rolla Enjoyer',
    'TO (Online)': 'Online Enjoyer'
  },
  
  EVENT_TYPES: {
    LOCAL: 'local',
    MISSOURI: 'missouri',
    OUT_OF_STATE: 'out_of_state', 
    ONLINE: 'online'
  },
  
  EVENT_TYPE_MAPPINGS: {
    // SEMO TOs create local events
    'TO (SEMO)': 'local',
    // Online TO creates online events
    'TO (Online)': 'online',
    // Missouri TO roles create missouri events
    'TO (St. Louis)': 'missouri',
    'TO (Jefferson City)': 'missouri',
    'TO (CoMo)': 'missouri',
    'TO (Kansas City)': 'missouri',
    'TO (Springfield)': 'missouri',
    'TO (Rolla)': 'missouri'
    // Note: Any other TO roles would create out_of_state events
  },
  
  EVENT_TYPE_LABELS: {
    local: '🏠 Local Events (SEMO)',
    missouri: '🏛️ Missouri Events',
    out_of_state: '🌍 Out of State Events',
    online: '💻 Online Events'
  },
  
  EVENT_TYPE_COLORS: {
    local: 0x00ff00,      // Green for local SEMO
    missouri: 0x9932cc,   // Purple for Missouri
    out_of_state: 0xff6b35, // Orange for out of state
    online: 0x0099ff      // Blue for online
  },

  // Missouri region mappings for display
  MISSOURI_REGIONS: {
    'TO (St. Louis)': 'STL',
    'TO (Jefferson City)': 'JC',
    'TO (CoMo)': 'CoMo',
    'TO (Kansas City)': 'KC',
    'TO (Springfield)': 'SGF',
    'TO (Rolla)': 'Rolla'
  },
  
  STARTGG_API_URL: 'https://api.start.gg/gql/alpha',
  
  COLORS: {
    PRIMARY: 0x00ff00,
    SUCCESS: 0x00ff00,
    WARNING: 0xffff00,
    ERROR: 0xff0000,
    TOURNAMENT: 0xff6b35,
    LOCAL: 0x00ff88,
    OUT_OF_REGION: 0x8800ff,
    ONLINE: 0x0088ff
  },
  
  TEXT_STEPS: [
    'startgg_url', 'event_name_manual', 'address', 'start_time',
    'events_custom', 'event_type_custom',
    'edit_event_name', 'edit_address', 'edit_to_contact', 'edit_start_time',
    'edit_events_custom', 'edit_event_type_custom'
  ]
};