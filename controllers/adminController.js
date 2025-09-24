const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Captain = require('../models/Captain');
const TeamMember = require('../models/TeamMember');
const bcrypt = require('bcrypt');
const Session=require("../models/session");
const cloudinary = require("../config/cloudinary");
const multer = require("multer")
const { logCreateStudent, logCreateCaptain, logEditStudent, logEditCaptain, logDeleteStudent, logAssignPositionStudent, logAssignPositionCaptainTeam, logApproveStudent, logApproveCaptain } = require('../utils/activityLogger');
// CREATE USER (Admin)
const storage = multer.memoryStorage();
const upload = multer({ storage });
const createUser = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    branch,
    urn,
    year,
    sport,   // old single sport
    sports,  // new multi-sport
    positions, // ✅ new positions array [{ sport: "Football", position: "1st" }]
    teamMemberCount,
    sessionId,
    rollNumber,
    course,
    photo,
    crn,
    fatherName,
    yearOfPassingMatric,
    yearOfPassingPlusTwo,
    firstAdmissionDate,
    lastExamName,
    lastExamYear,
    yearsOfParticipation,
    signaturePhoto,
    interCollegeGraduateCourse,
    interCollegePgCourse
  } = req.body;

  try {
    let existing = await User.findOne({ email });

    // Normalize sports input
    const normalizedSports = [].concat(sports || sport || [])
      .map(s => s.trim())
      .filter(Boolean);

    // Normalize positions input (optional)
    const normalizedPositions = Array.isArray(positions)
      ? positions
          .filter(p => p.sport && ["1st", "2nd", "3rd"].includes(p.position))
          .map(p => ({ sport: p.sport.trim(), position: p.position }))
      : [];

    let hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    let extraUserData = {};
    let generatedCaptainId = null;

    // ✅ Generate captainId if role is captain
    if (role === "captain") {
      const currentYear = new Date().getFullYear();
      const randomNum = Math.floor(100 + Math.random() * 900);
      generatedCaptainId = `CAPT${currentYear}-${randomNum}`;
      extraUserData.captainId = generatedCaptainId;
    }

    // ✅ Update existing user
    if (existing) {
      if (hashedPassword) existing.password = hashedPassword;
      existing.name = name || existing.name;
      existing.branch = branch || existing.branch;
      existing.year = year || existing.year;

      // ✅ Ensure roles array has current role
      if (!existing.roles?.includes(role)) {
        existing.roles = existing.roles || [];
        existing.roles.push(role);
      }

      await existing.save();
    } else {
      // ✅ Create new user with roles as array
      existing = new User({
        name,
        email,
        password: hashedPassword,
        roles: [role],   // ⬅ consistent field
        branch,
        urn,
        year,
        sports: normalizedSports,
        teamMemberCount,
        ...extraUserData,
      });
      await existing.save();
    }

    // ✅ If role = captain → create/update captain record
    if (role === "captain") {
      let captainProfile = await Captain.findOne({
        userId: existing._id,
        session: sessionId,
      });

      if (captainProfile) {
        // Update existing
        captainProfile.name = name || captainProfile.name;
        captainProfile.branch = branch || captainProfile.branch;
        captainProfile.urn = urn || captainProfile.urn;
        captainProfile.year = year || captainProfile.year;
        captainProfile.sport = normalizedSports[0] || captainProfile.sport;
        captainProfile.teamMemberCount = teamMemberCount || captainProfile.teamMemberCount;
        captainProfile.email = email || captainProfile.email;
        await captainProfile.save();
      } else {
        // Create new
        await Captain.create({
          captainId: generatedCaptainId,
          userId: existing._id, // ✅ link to User
          name,
          branch,
          urn,
          year,
          sport: normalizedSports[0] || "",
          teamMemberCount,
          email:email || "",
          session: sessionId,
          createdBy: req.user._id,
        });
      }
    }
    // ✅ If role = student → create/update student profile
    else if (role === "student") {
      let profile = await StudentProfile.findOne({
        userId: existing._id,
        session: sessionId,
      });

      if (profile) {
        // Update existing profile
        profile.sports = Array.from(new Set([...(profile.sports || []), ...normalizedSports]));
        if (normalizedPositions.length) {
          normalizedPositions.forEach(p => {
            const existingPos = profile.positions.find(pos => pos.sport === p.sport);
            if (existingPos) existingPos.position = p.position;
            else profile.positions.push(p);
          });
        }
        profile.name = name || profile.name;
        profile.branch = course || profile.branch;
        profile.year = year || profile.year;
        if (photo) profile.photo = photo;
        if (signaturePhoto) profile.signaturePhoto = signaturePhoto;
        if (crn) profile.crn = crn;
        if (fatherName) profile.fatherName = fatherName;
        if (yearOfPassingMatric) profile.yearOfPassingMatric = yearOfPassingMatric;
        if (yearOfPassingPlusTwo) profile.yearOfPassingPlusTwo = yearOfPassingPlusTwo;
        if (firstAdmissionDate) profile.firstAdmissionDate = firstAdmissionDate;
        if (lastExamName) profile.lastExamName = lastExamName;
        if (lastExamYear) profile.lastExamYear = lastExamYear;
        if (yearsOfParticipation) profile.yearsOfParticipation = yearsOfParticipation;
        if (interCollegeGraduateCourse) profile.interCollegeGraduateCourse = interCollegeGraduateCourse;
        if (interCollegePgCourse) profile.interCollegePgCourse = interCollegePgCourse;
        await profile.save();
      } else {
        // Create new profile
        await StudentProfile.create({
          userId: existing._id,
          urn: rollNumber,
          name,
          branch: course || "",
          year: year || "",
          sports: normalizedSports,
          positions: normalizedPositions, // ✅ save new positions
          session: sessionId || null,
          isRegistered: false,
          lockedForUpdate: false,
          photo: photo || "",
          signaturePhoto: signaturePhoto || "",
          crn: crn || "",
          fatherName: fatherName || "",
          yearOfPassingMatric: yearOfPassingMatric || "",
          yearOfPassingPlusTwo: yearOfPassingPlusTwo || "",
          firstAdmissionDate: firstAdmissionDate || "",
          lastExamName: lastExamName || "",
          lastExamYear: lastExamYear || "",
          yearsOfParticipation: yearsOfParticipation || 0,
          interCollegeGraduateCourse: interCollegeGraduateCourse || 0,
          interCollegePgCourse: interCollegePgCourse || 0,
        });
      }
    }

    // Log the activity
    if (role === "student") {
      if (existing.studentProfile) {
        await logEditStudent(req.user, existing._id, name);
      } else {
        await logCreateStudent(req.user, existing._id, name);
      }
    } else if (role === "captain") {
      if (existing.captainProfile) {
        await logEditCaptain(req.user, existing._id, name);
      } else {
        await logCreateCaptain(req.user, existing._id, name);
      }
    }

    res.status(201).json({
      message: `${role} created/updated successfully`,
      ...(generatedCaptainId && { captainId: generatedCaptainId }),
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Error creating user", error: err.message });
  }
};





// controllers/adminController.js
const getPendingProfiles = async (req, res) => {
  try {
    const students = await StudentProfile.find({
      $or: [
        { "status.personal": "pending" }, // personal pending
        { "sportsDetails.status": "pending" }, // any sport pending
      ],
    })
      .populate("userId", "email name")
      .populate("session", "session")
      .lean();

    res.json(
      students.map((student) => ({
        _id: student._id,
        name: student.name || "",
        email: student.userId?.email || "",
        urn: student.urn || "",
        crn: student.crn || "",
        branch: student.branch || "",
        year: student.year || "",
        sports: student.sports || [],
        session: student.session,
        dob: student.dob || "",
        gender: student.gender || "",
        address: student.address || "",
        phone: student.contact || "",
        photo: student.photo || "",
        signaturePhoto: student.signaturePhoto || "",
        yearOfPassingMatric: student.yearOfPassingMatric || "",
        yearOfPassingPlusTwo: student.yearOfPassingPlusTwo || "",
        yearsOfParticipation: student.yearsOfParticipation || 0,
        fatherName: student.fatherName || "",
        firstAdmissionDate: student.firstAdmissionDate || "",
        lastExamName: student.lastExamName || "",
        lastExamYear: student.lastExamYear || "",
        interCollegeGraduateCourse: student.interCollegeGraduateCourse,
        interCollegePgCourse: student.interCollegePgCourse,

        // ---- Pending flags for admin dashboard ----
        pendingPersonal: student.status?.personal === "pending",
        pendingSports: student.sportsDetails?.some(s => s.status === "pending"), // ✅ updated
        sportsDetails:student.sportsDetails
      }))
    );
  } catch (err) {
    console.error("Error fetching pending profiles:", err);
    res.status(500).json({ error: "Failed to fetch pending student profiles" });
  }
};





// ✅ Admin Approve

// -------------------- Approve --------------------
// -------------------- Approve --------------------
const approveStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // no sport needed

    const student = await StudentProfile.findById(id);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (type === "personal") {
      if (student.status.personal === "pending") {
        student.status.personal = "approved";
      }

    } else if (type === "sports") {
      let anyPending = false;
      student.sportsDetails.forEach(s => {
        if (s.status === "pending") {
          s.status = "approved";
          anyPending = true;
        }
      });

    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    await student.save();

    // Log the activity
    await logApproveStudent(req.user, student._id, student.name);

    res.json({ message: `${type} approved`, student });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed" });
  }
};

// -------------------- Reject --------------------
const rejectStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // no sport needed

    const student = await StudentProfile.findById(id);
    if (!student) return res.status(404).json({ error: "Student not found" });

    if (type === "personal") {
      if (student.status.personal === "pending") {
        student.status.personal = "none"; // reset only if pending
      }

    } else if (type === "sports") {
      let anyPending = false;
      student.sportsDetails.forEach(s => {
        if (s.status === "pending") {
          s.status = "none";
          anyPending = true;
        }
      });

    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    await student.save();

    res.json({ message: `${type} rejected`, student });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Rejection failed" });
  }
};







// controllers/adminController.js

const getAllCaptainsWithTeams = async (req, res) => {
  try {
    const captains = await Captain.find()
      .populate("session", "name year email")
      .populate("createdBy", "name email")
      .lean();

    const captainsWithTeams = await Promise.all(
      captains.map(async (captain) => {
        const team = await TeamMember.findOne({
          captainId: captain.captainId,     // ✅ match on custom captainId string
          sessionId: captain.session?._id,  // ✅ match on session
          status: "approved",               // ✅ only approved teams
        }).lean();

        if (!team) return null; // ❌ skip if no approved team

        return {
          ...captain,
          sessionId: team.sessionId,
          teamMembers: team.members,
          teamStatus: team.status,
          captainId: team.captainId,
        };
      })
    );

    // null hatao (sirf approved teams wale bache)
    const approvedCaptains = captainsWithTeams.filter(Boolean);

    res.json(approvedCaptains);
  } catch (error) {
    console.error("Error fetching captains with teams:", error);
    res.status(500).json({ message: "Server error while fetching captains with teams" });
  }
};



const getPendingTeams = async (req, res) => {
  try {
    // 1. Fetch pending teams
    const pendingTeams = await TeamMember.find({ status: "pending" })
      .populate("sessionId", "session")
      .lean();

    // 2. Collect captainIds from pending teams
    const captainCodes = pendingTeams.map(team => team.captainId);

    // 3. Fetch corresponding captains
    const captains = await Captain.find(
      { captainId: { $in: captainCodes } },
      "captainId name email sport teamName teamMemberCount year"
    ).lean();

    // 4. Create lookup map
    const captainMap = captains.reduce((acc, cap) => {
      acc[cap.captainId] = cap;
      return acc;
    }, {});

    // 5. Merge captain info & filter based on member count
    const formattedTeams = pendingTeams
      .map(team => {
        const captain = captainMap[team.captainId];
        if (!captain) return null;

        // ✅ Check if team members match captain's required count
        if (team.members.length !== captain.teamMemberCount) return null;

        return {
          ...team,
          captain,
        };
      })
      .filter(Boolean); // remove nulls

    res.json(formattedTeams);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch pending teams",
      error: err.message,
    });
  }
};



// UPDATE TEAM STATUS
const updateTeamStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    let updateData = { status };

    // get team with captain populated
    const team = await TeamMember.findById(req.params.teamId)
      .populate('sessionId', 'session');

    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (status === "rejected") {
      updateData.status = "pending";

      // 🔥 Captain reset (sirf admin ke bhare huye details safe)
      await Captain.findOneAndUpdate(
        { captainId: team.captainId },
        {
          email: "",
          phone: "",
          position: "pending",
          certificateAvailable: false,
          teamMembers: [] // reset members captain side
        }
      );

      // 🔥 TeamMember reset (sirf captainId/session safe rakho)
      updateData.members = [];
      updateData.position = "pending";
    }

    const updatedTeam = await TeamMember.findByIdAndUpdate(
      req.params.teamId,
      updateData,
      { new: true }
    )
      .populate('captainId', 'name branch urn year sport teamMemberCount') // admin bharaye huye
      .populate('sessionId', 'session');

    if (status === 'approved') {
      const captain = await Captain.findOne({ captainId: updatedTeam.captainId });
      await logApproveCaptain(req.user, captain._id, captain.name);
    }

    res.json({ message: `Team ${status}`, team: updatedTeam });
  } catch (err) {
    res.status(500).json({ message: 'Error updating team status', error: err.message });
  }
};

const getAllUsers = async (req, res) => { try { const users = await User.find({}, 'name email role'); res.json(users); } catch (err) { res.status(500).json({ message: 'Failed to fetch users', error: err.message }); } };
const getAllStudents = async (req, res) => {
  try {
    const students = await StudentProfile.find()
      .populate("userId", "name email gender")
      .populate("session", "session")
      .select("name urn crn branch year session photo status sports positions gender sportsDetails ")
      .lean();

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

// ✅ Fetch full student details
const getStudentById = async (req, res) => {
  try {
    const student = await StudentProfile.findById(req.params.id)
      .populate("userId", "name email role password gender") // ✅ password included
      .populate("session", "session year isActive")
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch student details" });
  }
}

// ------------------- UPDATE Student -------------------
const updateStudent = async (req, res) => {
  try {
    const { password, ...profileData } = req.body;

    // ✅ Convert userId and session to _id
    if (profileData.userId && typeof profileData.userId === "object" && profileData.userId._id) {
      profileData.userId = profileData.userId._id;
    }
    if (profileData.session && typeof profileData.session === "object" && profileData.session._id) {
      profileData.session = profileData.session._id;
    }

    // ✅ Parse positions if sent as string
    if (profileData.positions && typeof profileData.positions === "string") {
      try {
        profileData.positions = JSON.parse(profileData.positions);
      } catch (err) {
        console.error("Invalid positions JSON", err);
        return res.status(400).json({ message: "Invalid positions format" });
      }
    }

    // ✅ Parse sportsDetails if sent as string
    if (profileData.sportsDetails && typeof profileData.sportsDetails === "string") {
      try {
        profileData.sportsDetails = JSON.parse(profileData.sportsDetails);
      } catch (err) {
        console.error("Invalid sportsDetails JSON", err);
        return res.status(400).json({ message: "Invalid sportsDetails format" });
      }
    }
// ✅ Handle status.personal properly
if (profileData.statusPersonal) {
  profileData.status = { personal: profileData.statusPersonal };
  delete profileData.statusPersonal; // conflict avoid
} else if (
  profileData.status &&
  typeof profileData.status === "object" &&
  profileData.status.personal
) {
  profileData.status = { personal: profileData.status.personal };
}
// ✅ Parse notifications if sent as string
if (profileData.notifications && typeof profileData.notifications === "string") {
  try {
    profileData.notifications = JSON.parse(profileData.notifications);
  } catch (err) {
    console.error("Invalid notifications JSON", err);
    profileData.notifications = [];
  }
} else if (!Array.isArray(profileData.notifications)) {
  profileData.notifications = [];
}


    // ✅ Upload photo
    if (req.files?.photo?.[0]) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "students/photos" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.files.photo[0].buffer);
      });
      profileData.photo = result.secure_url;
    }

    // ✅ Upload signaturePhoto
    if (req.files?.signaturePhoto?.[0]) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "students/signatures" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.files.signaturePhoto[0].buffer);
      });
      profileData.signaturePhoto = result.secure_url;
    }

    // ✅ Ensure sports array is always an array
    if (profileData.sports && typeof profileData.sports === "string") {
      profileData.sports = profileData.sports.split(",").map(s => s.trim());
    } else if (!Array.isArray(profileData.sports)) {
      profileData.sports = [];
    }

    // ✅ Update StudentProfile
    const student = await StudentProfile.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    Object.assign(student, profileData); // merge updates
    const updated = await student.save(); // 🔥 triggers pre("save") sync middleware
    await updated.populate("userId");

    // ✅ If password provided → update User model
    if (password && updated.userId) {
      const hashed = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(updated.userId._id, { password: hashed });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update student", error: err.message });
  }
};




// ✅ Delete student
const deleteStudent = async (req, res) => {
  try {
    const deleted = await StudentProfile.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Student not found" });

    // Log the activity
    await logDeleteStudent(req.user, deleted._id, deleted.name);

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};
const assignSportPosition = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { sportName, position } = req.body; // ex: "Football", "1st"

    if (!["1st", "2nd", "3rd"].includes(position)) {
      return res.status(400).json({ message: "Invalid position" });
    }

    const student = await StudentProfile.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // ✅ Check if student is registered in that sport
    if (!student.sports.includes(sportName)) {
      return res.status(400).json({ message: "Student not registered in this sport" });
    }

    // ✅ Update or add new position
    const existing = student.positions.find(p => p.sport === sportName);
    if (existing) {
      existing.position = position;
    } else {
      student.positions.push({ sport: sportName, position });
    }

    await student.save();
    
    // Log the activity
    await logAssignPositionStudent(req.user, student._id, student.name, position);
    
    res.json({ message: "Position assigned successfully", student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error assigning position" });
  }
};
const assignTeamPosition = async (req, res) => {
  try {
    const { captainId, position } = req.body;

    // Captain update
    const captain = await Captain.findOne({ captainId:captainId });
    if (!captain) {
      return res.status(404).json({ message: "Captain not found" });
    }

    captain.position = position;
    captain.teamMembers = captain.teamMembers.map(m => ({
      ...m.toObject(),
      position
    }));
    await captain.save();

    // Team update
    const team = await TeamMember.findOne({ captainId });
    if (team) {
      team.position = position;
      team.members = team.members.map(m => ({
        ...m.toObject(),
        position
      }));
      await team.save();
    }

    // Log the activity
    await logAssignPositionCaptainTeam(req.user, captain._id, captain.name, `Position: ${position}`);

    res.json({ message: "Position assigned successfully", position });
  } catch (err) {
    console.error("Error assigning position:", err);
    res.status(500).json({ message: "Error assigning position" });
  }
};
const getallStudents = async (req, res) => {
  try {
    const { session, sport, position } = req.query;

    // Only filter by personal approval
    let filter = {
      "status.personal": "approved"
    };

    // Session filter (direct id match)
    if (session) {
      filter.session = session;
    }

    // Sport + Position filters
    if (sport && position) {
      filter.positions = { $elemMatch: { sport, position } };
    } 
    else if (sport) {
      filter["positions.sport"] = sport;
    } 
    else if (position) {
      filter["positions.position"] = position;
    }

    const students = await StudentProfile.find(filter)
      .populate("session", "session")
      .populate("userId", "name email")
      .lean();

    const formatted = students.map(st => ({
      name: st.name || "",
      fatherName: st.fatherName || "",
      dob: st.dob ? new Date(st.dob).toLocaleDateString("en-GB") : "",
      universityRegNo: st.urn || "",
      branchYear: `${st.branch || ""} - ${st.year || ""}`,
      matricYear: st.yearOfPassingMatric || "",
      plusTwoYear: st.yearOfPassingPlusTwo || "",
      firstAdmissionYear: st.firstAdmissionDate || "",
      lastExam: st.lastExamName || "",
      lastExamYear: st.lastExamYear || "",
      yearsOfParticipation: st.yearsOfParticipation,
      signatureUrl: st.signaturePhoto || "",
      addressWithPhone: `${st.address || ""} ${st.contact || ""}`,
      interCollegeGraduateCourse: st.interCollegeGraduateCourse,
      interCollegePgCourse: st.interCollegePgCourse,
      passportPhotoUrl: st.photo || "",
      events: (st.positions || []).map(pos => ({
        activity: pos.sport,
        position: pos.position
      })),
      session: st.session?.session || "",
      sports: st.sports || [],
      gender: st.gender || ""
    }));

    res.json(formatted);

  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};




const getAllSports = async (req, res) => {
  try {
    const sports = await StudentProfile.distinct("sports");
    res.json(sports);
  } catch (err) {
    console.error("❌ Error fetching sports:", err);
    res.status(500).json({ message: "Failed to fetch sports" });
  }
};

// 🔹 Sessions Dropdown
const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find().select("session");
    res.json(sessions);
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

// 🔹 Positions Dropdown
const getAllPositions = async (req, res) => {
  try {
    const positions = await StudentProfile.distinct("positions.position");
    res.json(positions);
  } catch (err) {
    console.error("❌ Error fetching positions:", err);
    res.status(500).json({ message: "Failed to fetch positions" });
  }
};



const getFilteredCaptains = async (req, res) => {
  try {
    let { session, sport, position } = req.body;

    let filter = {};

    // 🛠️ Session handling
    if (session) {
      // Agar frontend object bhej de toh uska _id nikal
      if (typeof session === "object" && session._id) {
        session = session._id;
      }
      filter.session = session;
    }

    if (sport) filter.sport = sport;
    if (position) filter.position = position;

    const captains = await Captain.find(filter)
      .populate("session", "session") 
      .populate({
        path: "teamMembers",
        select: "name urn branch year phone email"  // ✅ fields select kar le
      })
      .lean();


    res.json(captains);
  } catch (err) {
    console.error("Export filter error:", err);
    res.status(500).json({ message: "Failed to fetch captains" });
  }
};


const getCaptainFilters = async (req, res) => {
  try {
    const captains = await Captain.find()
      .populate("session", "session"); // ✅ only _id & session field

    // ✅ Sessions (unique _id + session string)
    const sessionsMap = new Map();
    captains.forEach(c => {
      if (c.session) {
        sessionsMap.set(String(c.session._id), {
          _id: c.session._id,
          session: c.session.session
        });
      }
    });

    // ✅ Sports (already string)
    const sports = [...new Set(captains.map(c => c.sport).filter(Boolean))];

    // ✅ Positions (already string)
    const positions = [...new Set(captains.map(c => c.position).filter(Boolean))];

    res.json({
      sessions: Array.from(sessionsMap.values()),
      sports,
      positions
    });
  } catch (err) {
    console.error("Captain filters error:", err);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
};


const getEligibleCertificates = async (req, res) => {
  try {
    // ✅ find active session automatically
    const activeSession = await Session.findOne({ isActive: true });
    if (!activeSession) {
      return res.status(404).json({ message: "No active session found" });
    }

    const sessionId = activeSession._id;
    const sessionName = activeSession.session;

    let certificates = [];

    // ✅ Captains with valid position
    const captains = await Captain.find({
      session: sessionId,
      position: { $ne: "pending" }
    }).lean();

    captains.forEach(cap => {
      certificates.push({
        name: cap.name,
        urn: cap.urn,
        branch: `${cap.branch} ${cap.year}`,
        sport: cap.sport,
        position: cap.position,
        session: sessionName, // 👈 directly return session string
      });
    });

    // ✅ Team members with valid position
    const teamDocs = await TeamMember.find({
      sessionId,
      position: { $ne: "pending" }
    }).lean();

    teamDocs.forEach(team => {
      team.members.forEach(mem => {
        if (mem.position && mem.position !== "pending") {
          certificates.push({
            name: mem.name,
            urn: mem.urn,
            branch: `${mem.branch} ${mem.year}`,
            sport: mem.sport || team.sport,
            position: mem.position,
            session: sessionName, // 👈 directly return session string
          });
        }
      });
    });

    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching certificate data" });
  }
};





module.exports = {
  createUser,
  getAllUsers,
  getPendingProfiles,
  getPendingTeams,
  updateTeamStatus,
  getAllCaptainsWithTeams,
  rejectStudentProfile,
  approveStudentProfile,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  assignSportPosition,
  assignTeamPosition,
  getallStudents,
  getAllSports,
  getAllPositions,
  getAllSessions,
  getFilteredCaptains,
  getCaptainFilters,
  getEligibleCertificates,
  upload,
};
