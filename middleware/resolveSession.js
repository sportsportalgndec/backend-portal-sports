const Session = require('../models/session');

async function resolveSession(req, res, next) {
  try {
    if (req.query.sessionId) {
      req.resolvedSessionId = req.query.sessionId;
    } else if (req.body.sessionId) {
      req.resolvedSessionId = req.body.sessionId;
    } else {
      const activeSession = await Session.findOne({ isActive: true });
      if (!activeSession) {
        return res.status(400).json({ message: 'No active session found' });
      }
      req.resolvedSessionId = activeSession._id;
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Error resolving session', error: err.message });
  }
}

module.exports = resolveSession;
