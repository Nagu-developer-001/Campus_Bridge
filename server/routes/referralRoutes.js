import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import Alumni from "../models/Alumni.js";
import ReferralRequest from "../models/ReferralRequest.js";
import { sendReferralRequestEmail } from "../services/emailService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Resume must be a PDF, DOC, or DOCX file."));
  }
});

const router = express.Router();

router.post("/", authenticateAdmin, upload.single("resumeFile"), async (req, res) => {
  try {
    const payload = normalizePayload({ ...req.body, studentDepartment: req.admin.department });
    const alumni = await Alumni.findById(payload.alumni);
    if (!alumni) {
      removeUploadedFile(req.file);
      return res.status(404).json({ message: "Selected alumni record not found" });
    }
    if (!sameDepartment(alumni.department, req.admin.department)) {
      removeUploadedFile(req.file);
      return res.status(403).json({ message: "Selected alumni does not belong to your registered department" });
    }

    const request = await ReferralRequest.create({
      ...payload,
      ...resumePayload(req.file),
      responseToken: crypto.randomBytes(24).toString("hex")
    });
    const populated = await request.populate("alumni");
    await attemptReferralEmail(populated);
    res.status(201).json(populated);
  } catch (error) {
    removeUploadedFile(req.file);
    res.status(400).json({ message: error.message });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { status = "" } = req.query;
    const filter = {
      studentDepartment: departmentRegex(req.admin.department)
    };

    if (status) filter.status = status;

    const requests = await ReferralRequest.find(filter).populate("alumni").sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/public/:id/resume", async (req, res) => {
  try {
    const request = await findRequestByToken(req.params.id, req.query.token);
    if (!request) {
      return res.status(404).json({ message: "Referral request not found or link is invalid" });
    }

    if (!request.resumeFileName) {
      return res.status(404).json({ message: "Resume file not found for this request" });
    }

    const resumePath = path.join(uploadDir, request.resumeFileName);
    if (!resumePath.startsWith(uploadDir) || !fs.existsSync(resumePath)) {
      return res.status(404).json({ message: "Resume file is missing from storage" });
    }

    res.download(resumePath, request.resumeOriginalName || "student-resume");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    const request = await findRequestByToken(req.params.id, req.query.token);
    if (!request) {
      return res.status(404).json({ message: "Referral request not found or link is invalid" });
    }

    if (!request.alumniViewedAt) {
      request.alumniViewedAt = new Date();
    }

    if (["Link Generated", "Sent to Alumni"].includes(request.status)) {
      request.status = "Viewed by Alumni";
    }

    await request.save();
    await request.populate("alumni");
    res.json(publicReferralPayload(request));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/public/:id/respond", async (req, res) => {
  try {
    const request = await findRequestByToken(req.params.id, req.body.token);
    if (!request) {
      return res.status(404).json({ message: "Referral request not found or link is invalid" });
    }

    const status = responseStatus(req.body.decision, req.body.alumniContactedStudent);
    request.status = status;
    request.alumniRemarks = req.body.alumniRemarks || "";
    request.alumniContactedStudent = Boolean(req.body.alumniContactedStudent);
    request.alumniRespondedAt = new Date();
    if (request.alumniContactedStudent && !request.studentContactedAt) {
      request.studentContactedAt = new Date();
    }

    await request.save();
    await request.populate("alumni");
    res.json(publicReferralPayload(request));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const request = await ReferralRequest.findOneAndUpdate(
      { _id: req.params.id, studentDepartment: departmentRegex(req.admin.department) },
      {
        status: req.body.status,
        adminNotes: req.body.adminNotes
      },
      { new: true, runValidators: true }
    ).populate("alumni");

    if (!request) {
      return res.status(404).json({ message: "Referral request not found" });
    }

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/send-email", authenticateAdmin, async (req, res) => {
  try {
    const request = await ReferralRequest.findOne({
      _id: req.params.id,
      studentDepartment: departmentRegex(req.admin.department)
    }).populate("alumni");
    if (!request) {
      return res.status(404).json({ message: "Referral request not found" });
    }

    await attemptReferralEmail(request);
    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function normalizePayload(payload) {
  return {
    ...payload,
    studentBatch: payload.studentBatch ? Number(payload.studentBatch) : undefined
  };
}

function resumePayload(file) {
  if (!file) return {};
  return {
    resumeFileName: file.filename,
    resumeOriginalName: file.originalname,
    resumeMimeType: file.mimetype,
    resumeSize: file.size,
    resumeLink: ""
  };
}

function removeUploadedFile(file) {
  if (!file?.path) return;
  fs.rm(file.path, { force: true }, () => {});
}

async function attemptReferralEmail(request) {
  request.emailDeliveryStatus = "Pending";
  request.emailError = "";

  const result = await sendReferralRequestEmail(request);
  request.emailDeliveryStatus = result.status;
  request.emailError = result.error || "";

  if (result.sent) {
    request.status = "Sent to Alumni";
    request.emailSentAt = new Date();
  }

  await request.save();
}

async function findRequestByToken(id, token) {
  if (!token) return null;
  return ReferralRequest.findOne({ _id: id, responseToken: token }).populate("alumni");
}

function responseStatus(decision, alumniContactedStudent) {
  if (alumniContactedStudent) return "Student Contacted";
  if (decision === "accept") return "Accepted by Alumni";
  if (decision === "decline") return "Declined by Alumni";
  if (decision === "more_details") return "Need More Details";
  return "Viewed by Alumni";
}

function publicReferralPayload(request) {
  return {
    id: request._id,
    status: request.status,
    studentName: request.studentName,
    studentEmail: request.studentEmail,
    studentPhone: request.studentPhone,
    studentDepartment: request.studentDepartment,
    studentBatch: request.studentBatch,
    targetCompany: request.targetCompany,
    targetRole: request.targetRole,
    studentSkills: request.studentSkills,
    resumeLink: request.resumeLink,
    resumeOriginalName: request.resumeOriginalName,
    resumeSize: request.resumeSize,
    hasResumeFile: Boolean(request.resumeFileName),
    requestReason: request.requestReason,
    alumniRemarks: request.alumniRemarks,
    alumniContactedStudent: request.alumniContactedStudent,
    alumniViewedAt: request.alumniViewedAt,
    alumniRespondedAt: request.alumniRespondedAt,
    studentContactedAt: request.studentContactedAt,
    alumni: request.alumni
      ? {
          fullName: request.alumni.fullName,
          email: request.alumni.email,
          companyName: request.alumni.companyName,
          jobRole: request.alumni.jobRole
        }
      : null
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function departmentRegex(department) {
  return new RegExp(`^${escapeRegex(department)}$`, "i");
}

function sameDepartment(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

export default router;
