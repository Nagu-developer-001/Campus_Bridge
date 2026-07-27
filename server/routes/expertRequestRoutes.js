import crypto from "node:crypto";
import express from "express";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import Alumni from "../models/Alumni.js";
import ExpertRequest from "../models/ExpertRequest.js";
import { sendExpertRequestEmail } from "../services/emailService.js";

const router = express.Router();

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const payload = normalizePayload({ ...req.body, department: req.admin.department });
    const alumni = await Alumni.findById(payload.alumni);

    if (!alumni) {
      return res.status(404).json({ message: "Selected alumni record not found" });
    }

    if (!sameDepartment(alumni.department, req.admin.department)) {
      return res.status(403).json({ message: "Selected alumni does not belong to your registered department" });
    }

    const request = await ExpertRequest.create({
      ...payload,
      responseToken: crypto.randomBytes(24).toString("hex")
    });

    const populated = await request.populate("alumni");
    await attemptExpertEmail(populated);
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { status = "", requestType = "" } = req.query;
    const filter = {
      department: departmentRegex(req.admin.department)
    };

    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const requests = await ExpertRequest.find(filter).populate("alumni").sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    const request = await findRequestByToken(req.params.id, req.query.token);
    if (!request) {
      return res.status(404).json({ message: "Expert/FDP request not found or link is invalid" });
    }

    if (!request.alumniViewedAt) {
      request.alumniViewedAt = new Date();
    }

    if (["Link Generated", "Sent to Alumni"].includes(request.status)) {
      request.status = "Viewed by Alumni";
    }

    await request.save();
    await request.populate("alumni");
    res.json(publicExpertPayload(request));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/public/:id/respond", async (req, res) => {
  try {
    const request = await findRequestByToken(req.params.id, req.body.token);
    if (!request) {
      return res.status(404).json({ message: "Expert/FDP request not found or link is invalid" });
    }

    request.status = responseStatus(req.body.decision);
    request.alumniRemarks = req.body.alumniRemarks || "";
    request.alumniRespondedAt = new Date();

    await request.save();
    await request.populate("alumni");
    res.json(publicExpertPayload(request));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const request = await ExpertRequest.findOneAndUpdate(
      { _id: req.params.id, department: departmentRegex(req.admin.department) },
      {
        status: req.body.status,
        adminNotes: req.body.adminNotes
      },
      { new: true, runValidators: true }
    ).populate("alumni");

    if (!request) {
      return res.status(404).json({ message: "Expert/FDP request not found" });
    }

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/send-email", authenticateAdmin, async (req, res) => {
  try {
    const request = await ExpertRequest.findOne({
      _id: req.params.id,
      department: departmentRegex(req.admin.department)
    }).populate("alumni");

    if (!request) {
      return res.status(404).json({ message: "Expert/FDP request not found" });
    }

    await attemptExpertEmail(request);
    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function normalizePayload(payload) {
  return {
    ...payload,
    proposedDate: payload.proposedDate ? new Date(payload.proposedDate) : undefined
  };
}

async function attemptExpertEmail(request) {
  request.emailDeliveryStatus = "Pending";
  request.emailError = "";

  const result = await sendExpertRequestEmail(request);
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
  return ExpertRequest.findOne({ _id: id, responseToken: token }).populate("alumni");
}

function responseStatus(decision) {
  if (decision === "accept") return "Accepted by Alumni";
  if (decision === "decline") return "Declined by Alumni";
  if (decision === "more_details") return "Need More Details";
  return "Viewed by Alumni";
}

function publicExpertPayload(request) {
  return {
    id: request._id,
    requestType: request.requestType,
    title: request.title,
    department: request.department,
    audience: request.audience,
    proposedDate: request.proposedDate,
    duration: request.duration,
    mode: request.mode,
    topic: request.topic,
    requestDetails: request.requestDetails,
    status: request.status,
    alumniRemarks: request.alumniRemarks,
    alumniViewedAt: request.alumniViewedAt,
    alumniRespondedAt: request.alumniRespondedAt,
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
