const { TEXT_STEPS } = require('../config/constants');
const sessionManager = require('../utils/sessionManager');
const embedBuilder = require('../utils/embedBuilder');
const { handleStartggStep } = require('../steps/startggStep');
const { askEventsQuestion } = require('../steps/eventsStep');
const { createTournamentAnnouncement } = require('./announcementHandler');
const { showFieldEditSelection } = require('../steps/fieldEditStep');

async function handleTournamentResponse(message, session) {
  try {
    // Check if session is in the same channel
    if (session.channelId !== message.channel.id) {
      return;
    }
    
    // Only handle text responses for announcement flow
    if (session.flow !== 'announcement') {
      return;
    }
    
    // Check for cancel command
    if (message.content.toLowerCase() === 'cancel') {
      const embed = embedBuilder.createSessionEmbed('Tournament creation cancelled.', 0xff0000);
      await session.botMessage.edit({ embeds: [embed], components: [] });
      sessionManager.deleteSession(message.author.id);
      return;
    }
    
    // Delete user's response message to keep chat clean
    try {
      await message.delete();
    } catch (deleteError) {
      // Ignore deletion errors (missing permissions, etc.)
    }
    
    const response = message.content.trim();
    
    switch (session.step) {
      case 'startgg_url':
        await handleStartggStep(message, session);
        break;
        
      case 'event_name_manual':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, eventName: response },
          step: 'address'
        });
        const embed = embedBuilder.createStepEmbed(
          'Step 3/6',
          'What is the **venue address**?\n\n*Example: 123 Main St, Springfield, IL 62701*'
        );
        await session.botMessage.edit({ embeds: [embed], components: [] });
        break;
        
      case 'address':
        // Skip venue/entry fee steps and add Discord username as TO contact
        const discordContact = `<@${message.author.id}>`;
        sessionManager.updateSession(session.userId, {
          data: { 
            ...session.data, 
            address: response,
            toContact: discordContact
          },
          step: 'start_time'
        });
        const addressStartTimeEmbed = embedBuilder.createStepEmbed(
          'Step 4/6',
          'What is the **start time and date**?\n\nPlease provide the full date and time for the tournament.\n\n*Examples:*\n• Saturday, July 15th at 2:00 PM CST\n• Sunday, August 12th at 1:00 PM\n• Friday, December 1st at 6:30 PM EST'
        );
        await session.botMessage.edit({ embeds: [addressStartTimeEmbed], components: [] });
        break;
        
      case 'start_time':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, startTime: response },
          step: 'events'
        });
        await askEventsQuestion(sessionManager.getSession(session.userId));
        break;
        
      case 'events_custom':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, events: response }
        });
        await createTournamentAnnouncement(sessionManager.getSession(session.userId));
        break;
        
      // Handle field editing steps
      case 'edit_event_name':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, eventName: response }
        });
        await showFieldEditSelection(sessionManager.getSession(session.userId));
        break;
        
      case 'edit_address':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, address: response }
        });
        await showFieldEditSelection(sessionManager.getSession(session.userId));
        break;
        
      case 'edit_to_contact':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, toContact: response }
        });
        await showFieldEditSelection(sessionManager.getSession(session.userId));
        break;
        
      case 'edit_start_time':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, startTime: response }
        });
        await showFieldEditSelection(sessionManager.getSession(session.userId));
        break;
        
      case 'edit_events_custom':
        sessionManager.updateSession(session.userId, {
          data: { ...session.data, events: response }
        });
        await showFieldEditSelection(sessionManager.getSession(session.userId));
        break;
    }
  } catch (error) {
    console.error('Error handling tournament response:', error);
    const errorEmbed = embedBuilder.createSessionEmbed(
      'Sorry, something went wrong. Please try again or type `cancel` to cancel.',
      0xff0000
    );
    await session.botMessage.edit({ embeds: [errorEmbed], components: [] });
  }
}

module.exports = {
  handleTournamentResponse
};

module.exports = {
  handleTournamentResponse
};