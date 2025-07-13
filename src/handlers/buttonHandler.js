const sessionManager = require('../utils/sessionManager');
const embedBuilder = require('../utils/embedBuilder');
const { askVenueFeeQuestion } = require('../steps/venueFeeStep');
const { askEntryFeeQuestion } = require('../steps/entryFeeStep');
const { createTournamentAnnouncement, postTournamentAnnouncement } = require('./announcementHandler');
const { startAnnouncementFlow } = require('../steps/announcementFlow');
const { startEditFlow } = require('../steps/editFlow');
const { showFieldEditSelection } = require('../steps/fieldEditStep');

async function handleButtonInteraction(interaction, session) {
  const { customId } = interaction;
  
  // Handle main selection buttons
  if (customId === 'announce_event') {
    await interaction.deferUpdate();
    await startAnnouncementFlow(session);
    return;
  }
  
  if (customId === 'edit_event') {
    await interaction.deferUpdate();
    await startEditFlow(session);
    return;
  }
  
  // Handle confirmation screen buttons
  if (customId === 'confirm_announcement') {
    if (!session.selectedRoles || session.selectedRoles.length === 0) {
      await interaction.reply({ 
        content: 'Please select roles to notify first.', 
        ephemeral: true 
      });
      return;
    }
    
    await interaction.deferUpdate();
    await postTournamentAnnouncement(session, session.selectedRoles);
    return;
  }
  
  if (customId === 'edit_announcement') {
    await interaction.deferUpdate();
    await startEditFlow(session);
    return;
  }
  
  if (customId === 'back_to_confirmation') {
    await interaction.deferUpdate();
    await createTournamentAnnouncement(session);
    return;
  }
  
  // Handle API data confirmation buttons
  if (customId === 'use_api_data') {
    sessionManager.updateSession(session.userId, { step: 'venue_fee' });
    await interaction.deferUpdate();
    await askVenueFeeQuestion(sessionManager.getSession(session.userId));
    return;
  }
  
  if (customId === 'edit_data') {
    await interaction.deferUpdate();
    // Use the field editing interface instead of sequential editing
    await startEditFlow(session);
    return;
  }
  
  // Handle venue fee buttons (both normal flow and edit flow)
  if (customId.startsWith('venue_')) {
    const feeValues = {
      'venue_free': 'Free',
      'venue_5': '$5',
      'venue_10': '$10'
    };
    
    if (feeValues[customId]) {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, venueFee: feeValues[customId] }
      });
      
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_venue_fee') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        sessionManager.updateSession(session.userId, { step: 'entry_fee' });
        await askEntryFeeQuestion(sessionManager.getSession(session.userId));
      }
    } else if (customId === 'venue_custom') {
      const step = session.step === 'edit_venue_fee' ? 'edit_venue_fee_custom' : 'venue_fee_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_venue_fee' ? 'Edit Venue Fee' : 'Step 4/8',
        'Please type the custom venue fee amount:\n\n*Example: $15 or $7.50*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    }
  } else if (customId.startsWith('entry_')) {
    const feeValues = {
      'entry_free': 'Free',
      'entry_5': '$5',
      'entry_10': '$10'
    };
    
    if (feeValues[customId]) {
      sessionManager.updateSession(session.userId, {
        data: { ...session.data, entryFee: feeValues[customId] }
      });
      
      await interaction.deferUpdate();
      
      // Check if we're in edit mode
      if (session.step === 'edit_entry_fee') {
        await showFieldEditSelection(sessionManager.getSession(session.userId));
      } else {
        await createTournamentAnnouncement(sessionManager.getSession(session.userId));
      }
    } else if (customId === 'entry_custom') {
      const step = session.step === 'edit_entry_fee' ? 'edit_entry_fee_custom' : 'entry_fee_custom';
      sessionManager.updateSession(session.userId, { step });
      await interaction.deferUpdate();
      const embed = embedBuilder.createStepEmbed(
        session.step === 'edit_entry_fee' ? 'Edit Entry Fee' : 'Step 5/8',
        'Please type the custom entry fee amount:\n\n*Example: $15 Singles, $5 Doubles*'
      );
      await session.botMessage.edit({ embeds: [embed], components: [] });
    }
  }
}

module.exports = {
  handleButtonInteraction
};

module.exports = {
  handleButtonInteraction
};

module.exports = {
  handleButtonInteraction
};