import mongoose from "mongoose";

const adminUserSchema = new mongoose.Schema(
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
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["Department Admin", "Super Admin"],
      default: "Department Admin"
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  { timestamps: true }
);

adminUserSchema.index({ department: 1, status: 1 });

export default mongoose.model("AdminUser", adminUserSchema);
