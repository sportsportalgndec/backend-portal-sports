const mongoose = require("mongoose");
const syncStudentProfilePlugin = require("../middleware/sync");

const StudentProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ----- Basic Info -----
    name: String,
    urn: { type: String, sparse: true }, // ✅ remove global unique
    crn: { type: String, sparse: true }, // ✅ remove global unique
    branch: String,
    year: Number,

    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },

    dob: String,
    gender: String,
    contact: String,
    address: String,

    fatherName: String,
    yearOfPassingMatric: Number,
    yearOfPassingPlusTwo: Number,
    firstAdmissionDate: { type: String }, // format: YYYY-MM
    lastExamName: String,
    lastExamYear: Number,
    yearsOfParticipation: { type: Number, default: 0 },
    interCollegeGraduateCourse:{type:Number},
    interCollegePgCourse:{type:Number},

    photo: { type: String },
    signaturePhoto: { type: String },

    // ----- Sports -----
    sports: [{ type: String }], // ✅ Approved sports only
    isCloned: { type: Boolean, default: false },

positions: [
  {
    sportId: { type: String },
    sport: { type: String, required: true },
    position: { type: String, enum: ["pending","1st", "2nd", "3rd", "participated"], required: true, default: "pending" }
  }
],
    // ----- Status -----
    status: {
      personal: {
        type: String,
        enum: ["none", "pending", "approved"],
        default: "none",
      },
    },
    // ✅ Simple sport-wise status
    sportsDetails: [
      {
        sportId: { type: String },
        sport: String,
        status: { type: String, enum: ["pending", "approved", "none"], default: "pending" }
      }
    ],
    // ----- Notifications -----
notifications: {
  type: [
    {
      type: { 
        type: String, 
        enum: ["info", "approval", "rejection"], 
        default: "info" 
      },
      message: { type: String, default: "" },
      read: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  default: [] // ✅ ensures empty array by default, not string
}

  },
  { timestamps: true }
);

// Apply plugin before compiling the model
StudentProfileSchema.plugin(syncStudentProfilePlugin);
module.exports = mongoose.model("StudentProfile", StudentProfileSchema);
