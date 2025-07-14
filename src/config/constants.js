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
    OUT_OF_REGION: 'out_of_region', 
    ONLINE: 'online'
  },
  
  EVENT_TYPE_MAPPINGS: {
    // SEMO TOs create local events
    'TO (SEMO)': 'local',
    // Online TO creates online events
    'TO (Online)': 'online',
    // All other TO roles create out of region events
    'TO (St. Louis)': 'out_of_region',
    'TO (Jefferson City)': 'out_of_region',
    'TO (CoMo)': 'out_of_region',
    'TO (Kansas City)': 'out_of_region',
    'TO (Springfield)': 'out_of_region',
    'TO (Rolla)': 'out_of_region'
  },
  
  EVENT_TYPE_LABELS: {
    local: '🏠 Local Events (SEMO)',
    out_of_region: '🌍 Out of Region Events',
    online: '💻 Online Events'
  },
  
  EVENT_TYPE_COLORS: {
    local: 0x00ff00,      // Green for local
    out_of_region: 0xff6b35, // Orange for out of region
    online: 0x0099ff      // Blue for online
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
    'startgg_url', 'event_name_manual', 'address', 'to_contact', 'start_time',
    'venue_fee_custom', 'entry_fee_custom', 'events_custom', 'event_type_custom',
    'edit_event_name', 'edit_address', 'edit_to_contact', 'edit_start_time',
    'edit_venue_fee_custom', 'edit_entry_fee_custom', 'edit_events_custom', 'edit_event_type_custom'
  ]
};