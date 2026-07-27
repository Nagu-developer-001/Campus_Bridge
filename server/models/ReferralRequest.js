import mongoose from "mongoose";

const referralRequestSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    studentPhone: {
      type: String,
      trim: true
    },
    studentDepartment: {
      type: String,
      required: true,
      trim: true
    },
    studentBatch: {
      type: Number,
      min: 1950,
      max: 2100
    },
    targetCompany: {
      type: String,
      trim: true
    },
    targetRole: {
      type: String,
      trim: true
    },
    studentSkills: {
      type: String,
      trim: true
    },
    resumeLink: {
      type: String,
      trim: true
    },
    resumeFileName: {
      type: String,
      trim: true
    },
    resumeOriginalName: {
      type: String,
      trim: true
    },
    resumeMimeType: {
      type: String,
      trim: true
    },
    resumeSize: {
      type: Number,
      min: 0
    },
    requestReason: {
      type: String,
      trim: true,
      maxlength: 800
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alumni",
      required: true
    },
    responseToken: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: [
        "Link Generated",
        "Sent to Alumni",
        "Viewed by Alumni",
        "Accepted by Alumni",
        "Declined by Alumni",
        "Need More Details",
        "Student Contacted",
        "Referral Completed",
        "Closed"
      ],
      default: "Link Generated"
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 600
    },
    alumniViewedAt: {
      type: Date
    },
    alumniRespondedAt: {
      type: Date
    },
    alumniRemarks: {
      type: String,
      trim: true,
      maxlength: 800
    },
    alumniContactedStudent: {
      type: Boolean,
      default: false
    },
    studentContactedAt: {
      type: Date
    },
    emailDeliveryStatus: {
      type: String,
      enum: ["Not Configured", "Pending", "Sent", "Failed"],
      default: "Pending"
    },
    emailSentAt: {
      type: Date
    },
    emailError: {
      type: String,
      trim: true,
      maxlength: 600
    }
  },
  { timestamps: true }
);

referralRequestSchema.index({ studentDepartment: 1, status: 1, createdAt: -1 });
referralRequestSchema.index({ alumni: 1, status: 1 });

export default mongoose.model("ReferralRequest", referralRequestSchema);
