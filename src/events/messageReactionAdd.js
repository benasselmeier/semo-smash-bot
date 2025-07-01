const { Events } = require('discord.js');
// Import the activeBracketMessages map from the bracket command
const { activeBracketMessages } = require('../commands/bracket');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    // Ignore reactions from bots
    if (user.bot) return;
    
    // Check if this is a bracket message that has pagination
    if (!activeBracketMessages.has(reaction.message.id)) return;
    
    // Handle bracket message pagination
    try {
      // Try to fetch the message if it's not fully cached
      if (reaction.partial) {
        await reaction.fetch();
      }
      
      const paginationData = activeBracketMessages.get(reaction.message.id);
      
      // Make sure we have valid pagination data
      if (!paginationData || !paginationData.phaseData || paginationData.phaseData.length === 0) {
        console.error('Invalid pagination data for message:', reaction.message.id);
        return;
      }
      
      // Check if the pagination data is too old (more than 5 minutes)
      if (paginationData.messageCreatedAt && Date.now() - paginationData.messageCreatedAt > 300000) {
        console.log(`Pagination data for message ${reaction.message.id} is too old. Removing.`);
        activeBracketMessages.delete(reaction.message.id);
        return;
      }
      
      // Get current state
      const currentPhase = paginationData.phaseData[paginationData.currentPhaseIndex];
      const totalRoundPages = Math.ceil(currentPhase.roundNames.length / paginationData.roundsPerPage);
      
      // Handle pagination based on the emoji
      if (reaction.emoji.name === '⬅️') {
        // Go back
        if (paginationData.currentRoundPage > 0) {
          // Previous page of rounds in current phase
          paginationData.currentRoundPage--;
        } else if (paginationData.currentPhaseIndex > 0) {
          // Previous phase
          paginationData.currentPhaseIndex--;
          const newPhase = paginationData.phaseData[paginationData.currentPhaseIndex];
          paginationData.currentRoundPage = Math.ceil(newPhase.roundNames.length / paginationData.roundsPerPage) - 1;
        }
      } else if (reaction.emoji.name === '➡️') {
        // Go forward
        if (paginationData.currentRoundPage < totalRoundPages - 1) {
          // Next page of rounds in current phase
          paginationData.currentRoundPage++;
        } else if (paginationData.currentPhaseIndex < paginationData.phaseData.length - 1) {
          // Next phase
          paginationData.currentPhaseIndex++;
          paginationData.currentRoundPage = 0;
        }
      }
      
      // Update the stored pagination data
      activeBracketMessages.set(reaction.message.id, paginationData);
      
      // Generate the updated embed
      const { generateBracketEmbed } = require('../commands/bracket');
      const embed = generateBracketEmbed(paginationData);
      
      // Update the message with the new embed
      await reaction.message.edit({ embeds: [embed] });
      
      // Remove the user's reaction to keep the message clean
      await reaction.users.remove(user.id).catch(error => console.error('Failed to remove reaction:', error));
    } catch (error) {
      console.error('Error handling bracket reaction:', error);
    }
  }
};

// We don't need to export activeBracketMessages since we're now importing it from bracket.js
