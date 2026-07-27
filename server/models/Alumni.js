import mongoose from "mongoose";

const alumniSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    graduationYear: {
      type: Number,
      min: 1950,
      max: 2100
    },
    department: {
      type: String,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    jobRole: {
      type: String,
      trim: true
    },
    skills: {
      type: String,
      trim: true
    },
    linkedinProfile: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    currentSector: {
      type: String,
      enum: ["Industry", "Teaching", "Government", "Higher Studies", "Entrepreneurship", "Other", ""],
      default: ""
    },
    availableForExpertTalk: {
      type: Boolean,
      default: false
    },
    availableForFdp: {
      type: Boolean,
      default: false
    },
    expertiseTopics: {
      type: String,
      trim: true
    },
    contactPreference: {
      type: String,
      enum: ["Email", "Phone", "WhatsApp", "LinkedIn", ""],
      default: "Email"
    },
    availabilityNotes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

export default mongoose.model("Alumni", alumniSchema);
