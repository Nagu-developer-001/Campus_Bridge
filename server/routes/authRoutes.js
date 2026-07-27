import express from "express";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";
import AdminUser from "../models/AdminUser.js";
import { createAdminToken, verifyPassword } from "../services/adminAuthService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email = "", password = "" } = req.body;
    const admin = await AdminUser.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return res.status(401).json({ message: "Invalid admin email or password" });
    }

    if (admin.status !== "Active") {
      return res.status(403).json({ message: "This admin account is inactive" });
    }

    res.json({
      token: createAdminToken(admin),
      admin: publicAdmin(admin)
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to login right now" });
  }
});

router.get("/me", authenticateAdmin, (req, res) => {
  res.json({ admin: publicAdmin(req.admin) });
});

function publicAdmin(admin) {
  return {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    department: admin.department,
    role: admin.role
  };
}

export default router;
