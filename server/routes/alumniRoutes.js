import express from "express";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import Alumni from "../models/Alumni.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const alumni = await Alumni.create(normalizePayload(req.body));
    res.status(201).json(alumni);
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    res.status(status).json({ message: error.message });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      search = "",
      graduationYear = "",
      currentSector = "",
      availableForExpertTalk = "",
      availableForFdp = ""
    } = req.query;

    const filter = {};
    filter.department = departmentRegex(req.admin.department);

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { jobRole: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
        { expertiseTopics: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }

    if (graduationYear) filter.graduationYear = Number(graduationYear);
    if (currentSector) filter.currentSector = currentSector;
    if (availableForExpertTalk) filter.availableForExpertTalk = availableForExpertTalk === "true";
    if (availableForFdp) filter.availableForFdp = availableForFdp === "true";

    const alumni = await Alumni.find(filter).sort({ createdAt: -1 });
    res.json(alumni);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const alumni = await Alumni.findOne({ _id: req.params.id, department: departmentRegex(req.admin.department) });
    if (!alumni) {
      return res.status(404).json({ message: "Alumni record not found" });
    }
    res.json(alumni);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const alumni = await Alumni.findOneAndUpdate(
      { _id: req.params.id, department: departmentRegex(req.admin.department) },
      normalizePayload({ ...req.body, department: req.admin.department }),
      {
        new: true,
        runValidators: true
      }
    );
    if (!alumni) {
      return res.status(404).json({ message: "Alumni record not found" });
    }
    res.json(alumni);
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    res.status(status).json({ message: error.message });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const alumni = await Alumni.findOneAndDelete({ _id: req.params.id, department: departmentRegex(req.admin.department) });
    if (!alumni) {
      return res.status(404).json({ message: "Alumni record not found" });
    }
    res.json({ message: "Alumni record deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function normalizePayload(payload) {
  return {
    ...payload,
    graduationYear: payload.graduationYear ? Number(payload.graduationYear) : undefined,
    availableForExpertTalk: Boolean(payload.availableForExpertTalk),
    availableForFdp: Boolean(payload.availableForFdp)
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function departmentRegex(department) {
  return new RegExp(`^${escapeRegex(department)}$`, "i");
}

export default router;
