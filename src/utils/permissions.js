/**
 * Utility for checking user permissions
 */

// Roles that are considered moderators (customize these for your server)
const MODERATOR_ROLES = ['Moderator', 'Admin', 'TO', 'Tournament Organizer'];

/**
 * Check if a user has moderator permissions
 * @param {object} member - Discord guild member object
 * @returns {boolean} - Whether the user has moderator permissions
 */
function isModerator(member) {
  try {
    // Server owner is always a moderator
    if (member.guild.ownerId === member.id) {
      return true;
    }
    
    // Check for moderator roles
    return member.roles.cache.some(role => 
      MODERATOR_ROLES.includes(role.name) || 
      role.permissions.has('Administrator') || 
      role.permissions.has('ManageGuild')
    );
  } catch (error) {
    console.error('Error checking moderator status:', error);
    // Fallback to checking if the user has admin permissions on their highest role
    return member.permissions.has('Administrator');
  }
}

module.exports = {
  isModerator,
  MODERATOR_ROLES
};
