import crypto from "node:crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { suranaAlumni, suranaReferralRequests } from "../data/suranaDemoData.js";
import AdminUser from "../models/AdminUser.js";
import Alumni from "../models/Alumni.js";
import ReferralRequest from "../models/ReferralRequest.js";
import { hashPassword } from "../services/adminAuthService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campusbridge";
const DEFAULT_ADMIN_PASSWORD = "surana123";

const suranaAdmins = [
  {
    fullName: "CSE Department Admin",
    email: "cse.admin@surana.edu.in",
    department: "Computer Science"
  },
  {
    fullName: "Commerce Department Admin",
    email: "commerce.admin@surana.edu.in",
    department: "Commerce"
  },
  {
    fullName: "BBA Department Admin",
    email: "bba.admin@surana.edu.in",
    department: "Business Administration"
  },
  {
    fullName: "Psychology Department Admin",
    email: "psychology.admin@surana.edu.in",
    department: "Psychology"
  },
  {
    fullName: "English Department Admin",
    email: "english.admin@surana.edu.in",
    department: "English"
  }
];

await mongoose.connect(MONGO_URI);

for (const admin of suranaAdmins) {
  await AdminUser.findOneAndUpdate(
    { email: admin.email },
    {
      $set: {
        ...admin,
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        role: "Department Admin",
        status: "Active"
      }
    },
    { new: true, upsert: true, runValidators: true }
  );
}

const alumniByEmail = new Map();

for (const record of suranaAlumni) {
  const alumni = await Alumni.findOneAndUpdate(
    { email: record.email },
    { $set: record },
    { new: true, upsert: true, runValidators: true }
  );
  alumniByEmail.set(record.email, alumni);
}

for (const request of suranaReferralRequests) {
  const alumni = alumniByEmail.get(request.alumniEmail);
  if (!alumni) continue;

  await ReferralRequest.findOneAndUpdate(
    {
      studentEmail: request.studentEmail,
      alumni: alumni._id,
      targetCompany: request.targetCompany
    },
    {
      $set: {
        studentName: request.studentName,
        studentEmail: request.studentEmail,
        studentPhone: request.studentPhone,
        studentDepartment: request.studentDepartment,
        studentBatch: request.studentBatch,
        targetCompany: request.targetCompany,
        targetRole: request.targetRole,
        studentSkills: request.studentSkills,
        resumeLink: "",
        requestReason: request.requestReason,
        alumni: alumni._id,
        status: request.status,
        alumniRemarks: request.alumniRemarks || "",
        alumniContactedStudent: Boolean(request.alumniContactedStudent),
        emailDeliveryStatus: request.status === "Link Generated" ? "Pending" : "Sent",
        emailSentAt: request.status === "Link Generated" ? undefined : new Date(),
        emailError: "",
        alumniViewedAt: ["Viewed by Alumni", "Accepted by Alumni", "Declined by Alumni", "Need More Details", "Student Contacted", "Referral Completed"].includes(request.status)
          ? new Date()
          : undefined,
        alumniRespondedAt: ["Accepted by Alumni", "Declined by Alumni", "Need More Details", "Student Contacted", "Referral Completed"].includes(request.status)
          ? new Date()
          : undefined,
        studentContactedAt: request.alumniContactedStudent ? new Date() : undefined
      },
      $setOnInsert: {
        responseToken: crypto.randomBytes(24).toString("hex")
      }
    },
    { new: true, upsert: true, runValidators: true }
  );
}

const alumniCount = await Alumni.countDocuments({
  email: { $in: suranaAlumni.map((record) => record.email) }
});
const referralCount = await ReferralRequest.countDocuments({
  studentEmail: { $in: suranaReferralRequests.map((record) => record.studentEmail) }
});
const adminCount = await AdminUser.countDocuments({
  email: { $in: suranaAdmins.map((record) => record.email) }
});

console.log(`Seeded Surana College demo data: ${alumniCount} alumni, ${referralCount} referral requests, ${adminCount} admin accounts.`);
console.log(`Demo admin password for all seeded department admins: ${DEFAULT_ADMIN_PASSWORD}`);

await mongoose.disconnect();
