/**
 * Script to initialize the data directory and create empty data files
 */

const fs = require('fs').promises;
const path = require('path');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');

async function init() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('✅ Data directory created or already exists.');

    // Create empty players file if it doesn't exist
    try {
      await fs.access(PLAYERS_FILE);
      console.log('ℹ️ Players file already exists, skipping creation.');
    } catch {
      await fs.writeFile(PLAYERS_FILE, JSON.stringify({ players: [] }, null, 2), 'utf8');
      console.log('✅ Empty players.json file created.');
    }

    // Create empty matches file if it doesn't exist
    try {
      await fs.access(MATCHES_FILE);
      console.log('ℹ️ Matches file already exists, skipping creation.');
    } catch {
      await fs.writeFile(MATCHES_FILE, JSON.stringify({ matches: [] }, null, 2), 'utf8');
      console.log('✅ Empty matches.json file created.');
    }

    console.log('🎉 Initialization complete. Your bot is ready to store data.');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

init();
