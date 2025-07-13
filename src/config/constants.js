module.exports = {
  ROLE_MAPPINGS: {
    'TO (SEMO)': 'SEMO Enjoyer',
    'TO (St. Louis)': 'St. Louis Enjoyer',
    'TO (Jefferson City)': 'Jefferson City Enjoyer',
    'TO (CoMo)': 'CoMo Enjoyer',
    'TO (Kansas City)': 'Kansas City Enjoyer',
    'TO (Springfield)': 'Springfield Enjoyer',
    'TO (Rolla)': 'Rolla Enjoyer'
  },
  
  STARTGG_API_URL: 'https://api.start.gg/gql/alpha',
  
  COLORS: {
    PRIMARY: 0x00ff00,
    SUCCESS: 0x00ff00,
    WARNING: 0xffff00,
    ERROR: 0xff0000,
    TOURNAMENT: 0xff6b35
  },
  
  TEXT_STEPS: [
    'startgg_url', 'event_name_manual', 'address', 'to_contact', 'start_time',
    'venue_fee_custom', 'entry_fee_custom', 'events_custom',
    'edit_event_name', 'edit_address', 'edit_to_contact', 'edit_start_time',
    'edit_venue_fee_custom', 'edit_entry_fee_custom', 'edit_events_custom'
  ]
};