const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["captain", "member"], // ✅ sirf captain & member
      required: true,
    },

    // 🧑 Captain ke liye direct reference
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
      required: true,
    },

    // 👥 Member ke liye embedded info (kyunki unka alag model nahi hai)
    memberInfo: {
      name: String,
      urn: String,
      branch: String,
      year: Number,
      email: String,
      phone: String,
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    sport: { type: String, required: true },
    position: { type: String, default: "Participant" },

    status: {
      type: String,
      enum: ["issued", "revoked"],
      default: "issued",
    },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate issuance
CertificateSchema.index(
  {
    recipientType: 1,
    captainId: 1,
    "memberInfo.urn": 1, // sirf member ke case me relevant
    session: 1,
    sport: 1,
    position: 1,
  },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Certificate", CertificateSchema);
