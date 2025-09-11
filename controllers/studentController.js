const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary'); 
const multer = require('multer');
const streamifier = require('streamifier');
const Session=require('../models/session')

const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "signaturePhoto", maxCount: 1 }
]);

// Utility function to generate a student ID
const generateStudentId = () => {
  return 'STU-' + Math.floor(100000 + Math.random() * 900000);
};

// ================= GET PROFILE =================

exports.getStudentProfile = async (req, res) => {
  try {
    // 1) Try to get profile for current session
    let profile = await StudentProfile
      .findOne({ userId: req.user._id, session: req.resolvedSessionId })
      .populate("session");

    let isCloned = false;

    // 2) If not found → clone last profile
    if (!profile) {
      const lastProfile = await StudentProfile
        .findOne({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!lastProfile) {
        return res.status(404).json({
          message: "Profile not found for this session and no previous profile to copy."
        });
      }

      const cloneDoc = {
        userId: lastProfile.userId,
        session: req.resolvedSessionId,

        // carry forward
        name: lastProfile.name,
        branch: lastProfile.branch,
        urn: lastProfile.urn,
        crn: lastProfile.crn,
        dob: lastProfile.dob,
        gender: lastProfile.gender,
        contact: lastProfile.contact,
        address: lastProfile.address,
        fatherName: lastProfile.fatherName,
        yearOfPassingMatric: lastProfile.yearOfPassingMatric,
        yearOfPassingPlusTwo: lastProfile.yearOfPassingPlusTwo,
        firstAdmissionDate: lastProfile.firstAdmissionDate,
        photo: lastProfile.photo,
        signaturePhoto: lastProfile.signaturePhoto,

        // 👇 new fields carry forward
        interCollegeGraduateCourse: lastProfile.interCollegeGraduateCourse ?? 0,
        interCollegePgCourse: lastProfile.interCollegePgCourse ?? 0,

        // reset for new session
        year: null,
        sports: [],
        positions: [],
        lastExamName: "",
        lastExamYear: null,

        status: { personal: "none", sports: "none" },
        notifications: [],
        yearsOfParticipation: (lastProfile.yearsOfParticipation || 0) + 1,
        isCloned:true,
      };

      profile = await StudentProfile.create(cloneDoc);
      profile = await profile.populate("session");

    }

    // 3) Get email separately
    const user = await User.findById(req.user._id).select("email").lean();
    const email = user?.email || "";

    // 4) Response
    res.json({
      email,
      name: profile.name || "",
      branch: profile.branch || "",
      urn: profile.urn || "",
      crn: profile.crn || "",
      year: profile.year || "",
      sports: Array.isArray(profile.sports) ? profile.sports : [],
      dob: profile.dob || "",
      gender: profile.gender || "",
      contact: profile.contact || "",
      address: profile.address || "",
      fatherName: profile.fatherName || "",
      yearOfPassingMatric: profile.yearOfPassingMatric || "",
      yearOfPassingPlusTwo: profile.yearOfPassingPlusTwo || "",
      firstAdmissionDate: profile.firstAdmissionDate || "",
      lastExamName: profile.lastExamName || "",
      lastExamYear: profile.lastExamYear || "",
      yearsOfParticipation: profile.yearsOfParticipation || 0,
      photo: profile.photo || "",
      signaturePhoto: profile.signaturePhoto || "",
      status: profile.status || { personal: "none", sports: "none" },
      positions: Array.isArray(profile.positions) ? profile.positions : [],
      interCollegeGraduateCourse: profile.interCollegeGraduateCourse ?? 0,
      interCollegePgCourse: profile.interCollegePgCourse ?? 0,
      isCloned: profile.isCloned || false,
      sessionId:req.resolvedSessionId
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};




// ================= UPDATE PROFILE =================
exports.updateStudentProfile = async (req, res) => {
  const activeSession = await Session.findOne({ isActive: true });
if (!activeSession) {
  return res.status(404).json({ message: 'Active session not found' });
}
  try {
    let profile = await StudentProfile.findOne({
      userId: req.user._id,
      session: activeSession._id
    });

    if (!profile) {
      const user = await User.findById(req.user.id).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });

      profile = new StudentProfile({
        userId: req.user._id,
        name: user.name || '', branch: user.branch || '',
        urn: user.urn || '', crn: user.crn || '', year: user.year || '',
        sports: [], session: activeSession._id
      });
    }

    // personal fields
    const personalFields = [
      'name','branch','urn','crn','year','dob','gender','contact',
      'address','fatherName','yearOfPassingMatric','yearOfPassingPlusTwo',
      'firstAdmissionDate','lastExamName','lastExamYear','yearsOfParticipation'
    ];

    if (!profile.lockedPersonal) {
      personalFields.forEach(field => {
        if (req.body[field] !== undefined) profile[field] = req.body[field];
      });
    }

    // sports
    if (!profile.lockedSports) {
      if (Array.isArray(req.body.sports)) profile.sports = req.body.sports;
      else if (req.body.sport) profile.sports = [req.body.sport];
    }

    // file uploads
    if (req.files) {
      const uploadToCloudinary = (fileBuffer, folder) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => (result ? resolve(result) : reject(error))
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };

      if (req.files.photo?.[0] && !profile.lockedPersonal) {
        const result = await uploadToCloudinary(req.files.photo[0].buffer, 'student_photos');
        profile.photo = result.secure_url;
      }
      if (req.files.signaturePhoto?.[0] && !profile.lockedPersonal) {
        const result = await uploadToCloudinary(req.files.signaturePhoto[0].buffer, 'student_signatures');
        profile.signaturePhoto = result.secure_url;
      }
    }

    await profile.save();
    res.json({ message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ================= SUBMIT PROFILE =================
exports.submitStudentProfile = async (req, res) => {
  const activeSession = await Session.findOne({ isActive: true });
if (!activeSession) {
  return res.status(404).json({ message: 'Active session not found' });
}
  try {
    const profile = await StudentProfile.findOne({
      userId: req.user._id,
      session: activeSession._id
    });

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    let submittedPersonal = false;
    let submittedSports = false;

    const personalFields = [
      'name','branch','urn','crn','year','dob','gender','contact',
      'address','fatherName','yearOfPassingMatric','yearOfPassingPlusTwo',
      'firstAdmissionDate','lastExamName','lastExamYear','yearsOfParticipation'
    ];

    personalFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
        submittedPersonal = true;
      }
    });

    if (submittedPersonal) profile.lockedPersonal = true;
    if (submittedPersonal) {
  profile.status.personal = "pending";   // ✅ set pending on submit
}

// ----- Sports submission -----

    const newSports = Array.isArray(req.body.sports)
      ? req.body.sports : req.body.sport ? [req.body.sport] : [];

    if (newSports.length > 0) {
      profile.sports = [...new Set([...(profile.sports || []), ...newSports])];
      profile.lockedSports = true;
      profile.sportsForApproval = true;
      submittedSports = true;
    }
if (submittedSports) {
  profile.status.sports = "pending";     // ✅ set pending on submit
}
    // files
    if (req.files) {
      const uploadToCloudinary = (fileBuffer, folder) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => (result ? resolve(result) : reject(error))
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };

      if (req.files.photo?.[0]) {
        const result = await uploadToCloudinary(req.files.photo[0].buffer, 'student_photos');
        profile.photo = result.secure_url;
        submittedPersonal = true;
        profile.lockedPersonal = true;
      }
      if (req.files.signaturePhoto?.[0]) {
        const result = await uploadToCloudinary(req.files.signaturePhoto[0].buffer, 'student_signatures');
        profile.signaturePhoto = result.secure_url;
        submittedPersonal = true;
        profile.lockedPersonal = true;
      }
    }

    await profile.save();

    const parts = [];
    if (submittedPersonal) parts.push('personal');
    if (submittedSports) parts.push('sports');

    res.json({
      message: `Profile submitted for admin approval (${parts.join(' & ')})`,
      profile
    });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// POST /student/mark-notifications-read
exports.markNotificationsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No notification IDs provided' });
    }

    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { "notifications.$[n].read": true } },
      { arrayFilters: [{ "n._id": { $in: objectIds } }], new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};
// POST /student/upload-photo
// ... existing imports

// POST /student/upload-photo
// POST /student/upload-photos
exports.uploadStudentPhoto = async (req, res) => {
  try {
    if (!req.files || (!req.files.photo && !req.files.signaturePhoto)) {
      return res.status(400).json({ error: "No files provided" });
    }

    // Find profile
    const profile = await StudentProfile.findOne({
      userId: req.user._id,
      session: req.resolvedSessionId
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // 🚫 Prevent changes if locked
    if (profile.lockedPersonal) {
      return res.status(400).json({
        error: "Personal details are locked pending admin review"
      });
    }

    // Upload helper
    const streamUpload = (fileBuffer, folder) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });

    let photoUrl = profile.photo;
    let signatureUrl = profile.signaturePhoto;

    // Upload student photo
    if (req.files.photo) {
      const result = await streamUpload(
        req.files.photo[0].buffer,
        "student_photos"
      );
      photoUrl = result.secure_url;
      profile.photo = photoUrl;
    }

    // Upload signature
    if (req.files.signaturePhoto) {
      const result = await streamUpload(
        req.files.signaturePhoto[0].buffer,
        "student_signatures"
      );
      signatureUrl = result.secure_url;
      profile.signaturePhoto = signatureUrl;
    }

    await profile.save();

    res.json({
      success: true,
      message: "Files uploaded successfully",
      photoUrl,
      signatureUrl,
      profile
    });
  } catch (err) {
    console.error("Error uploading files:", err);
    res.status(500).json({ error: "Failed to upload files" });
  }
};


// In updateStudentProfile + submitStudentProfile 
// keep saving `profile.photo = result.secure_url;` but no need to change payload 
// since frontend reads it from fetchProfile()
