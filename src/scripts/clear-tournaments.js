const { getData, saveData } = require('../utils/dataStore');

async function clearTournamentData() {
    try {
        console.log('Clearing all tournament and match data...');
        
        // Clear tournaments
        await saveData('tournaments', []);
        console.log('✓ Cleared tournament data');
        
        // Clear matches
        await saveData('matches', []);
        console.log('✓ Cleared match data');
        
        // Verify the clear worked
        const tournaments = await getData('tournaments');
        const matches = await getData('matches');
        
        console.log('\nVerification:');
        console.log(`Tournaments remaining: ${tournaments.length}`);
        console.log(`Matches remaining: ${matches.length}`);
        
        console.log('\nSuccessfully cleared all tournament and match data');
    } catch (error) {
        console.error('Error clearing data:', error);
    }
}

clearTournamentData();