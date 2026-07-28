import AdminUser from "../models/AdminUser.js";
import { verifyAdminToken } from "../services/adminAuthService.js";

export async function authenticateAdmin(req, res, next) {
  try {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const payload = verifyAdminToken(token);

    if (!payload) {
      return res.status(401).json({ message: "Admin login required" });
    }

    const admin = await AdminUser.findOne({ _id: payload.sub, status: "Active" });
    if (!admin) {
      return res.status(401).json({ message: "Admin account is inactive or unavailable" });
    }
    console.log("Admin authenticated:", admin);
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: "Admin login required" });
  }
}
