import mongoose from "mongoose";

const expertRequestSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ["Expert Talk", "FDP"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    audience: {
      type: String,
      enum: ["Students", "Faculty", "Students and Faculty"],
      default: "Students"
    },
    proposedDate: {
      type: Date
    },
    duration: {
      type: String,
      trim: true
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Offline"
    },
    topic: {
      type: String,
      trim: true
    },
    requestDetails: {
      type: String,
      trim: true,
      maxlength: 1000
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
        "Session Scheduled",
        "Completed",
        "Closed"
      ],
      default: "Link Generated"
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
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 600
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

expertRequestSchema.index({ department: 1, status: 1, createdAt: -1 });
expertRequestSchema.index({ alumni: 1, status: 1 });

export default mongoose.model("ExpertRequest", expertRequestSchema);
