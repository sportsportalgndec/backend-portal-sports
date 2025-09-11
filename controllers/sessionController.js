// controllers/sessionController.js
const Session = require('../models/session');
const { logSessionCreated, logSessionDeleted, logSessionActivated } = require('../utils/activityLogger');

exports.createSession = async (req, res) => {
  const { startMonth, endMonth, year } = req.body;

  try {
    if (!startMonth || !endMonth) {
      return res.status(400).json({ message: 'Start and end month required' });
    }
    if (!year || isNaN(year)) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    // ✅ Build session label
    const sessionLabel = `${startMonth}–${endMonth} ${year}`;

    // ✅ Month mapping to number
    const monthMap = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, June: 5,
      July: 6, Aug: 7, Sept: 8, Oct: 9, Nov: 10, Dec: 11
    };

    if (!(startMonth in monthMap) || !(endMonth in monthMap)) {
      return res.status(400).json({ message: 'Invalid month names' });
    }

    // ✅ Start and end dates
    const startDate = new Date(year, monthMap[startMonth], 1);
    const endDate = new Date(year, monthMap[endMonth] + 1, 0); // last day of end month

    // Deactivate old sessions
    await Session.updateMany({}, { isActive: false });

    const newSession = new Session({
      session: sessionLabel,
      startDate,
      endDate,
      isActive: true
    });

    await newSession.save();

    // Log the activity
    await logSessionCreated(req.user, newSession._id, newSession.session);

    res.status(201).json({
      message: 'New session created and activated',
      session: newSession
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating session', error: err.message });
  }
};


exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
};

exports.getActiveSession = async (req, res) => {
  try {
    const activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
      return res.status(404).json({ message: 'No active session found' });
    }
    res.json(activeSession);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching active session' });
  }
};

exports.setActiveSession = async (req, res) => {
  const sessionId = req.params.id;

  try {
    await Session.updateMany({}, { isActive: false });
    const session = await Session.findByIdAndUpdate(sessionId, { isActive: true }, { new: true });

    // Log the activity
    await logSessionActivated(req.user, session._id, session.session);

    res.json({ message: 'Session activated', session });
  } catch (err) {
    res.status(500).json({ message: 'Error setting session active', error: err.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    await Session.findByIdAndDelete(req.params.id);
    
    // Log the activity
    await logSessionDeleted(req.user, session._id, session.session);
    
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting session' });
  }
};
