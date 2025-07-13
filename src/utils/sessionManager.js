const { Collection } = require('discord.js');

class SessionManager {
  constructor() {
    this.sessions = new Collection();
    this.startCleanupInterval();
  }

  createSession(userId, data) {
    const session = {
      userId,
      ...data,
      lastMessageTime: Date.now()
    };
    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId) {
    return this.sessions.get(userId);
  }

  hasSession(userId) {
    return this.sessions.has(userId);
  }

  deleteSession(userId) {
    this.sessions.delete(userId);
  }

  updateSession(userId, data) {
    const session = this.sessions.get(userId);
    if (session) {
      Object.assign(session, data, { lastMessageTime: Date.now() });
    }
    return session;
  }

  startCleanupInterval() {
    // Clean up old sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      for (const [userId, session] of this.sessions.entries()) {
        if (now - session.lastMessageTime > fiveMinutes) {
          this.sessions.delete(userId);
        }
      }
    }, 5 * 60 * 1000);
  }
}

module.exports = new SessionManager();