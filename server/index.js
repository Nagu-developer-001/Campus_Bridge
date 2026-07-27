import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import alumniRoutes from "./routes/alumniRoutes.js";
import expertRequestRoutes from "./routes/expertRequestRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campusbridge";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "CampusBridge Alumni Management" });
});

app.use("/api/auth", authRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/expert-requests", expertRequestRoutes);
app.use("/api/referrals", referralRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
