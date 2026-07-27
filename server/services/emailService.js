import nodemailer from "nodemailer";

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export function referralResponseLink(request) {
  const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:5173";
  return `${baseUrl}/?page=referral-response&id=${request._id}&token=${request.responseToken}`;
}

export function referralResumeLink(request) {
  if (!request.resumeFileName) return request.resumeLink || "";
  const apiBaseUrl = process.env.API_BASE_URL || "http://127.0.0.1:5000";
  return `${apiBaseUrl}/api/referrals/public/${request._id}/resume?token=${request.responseToken}`;
}

export function expertResponseLink(request) {
  const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:5173";
  return `${baseUrl}/?page=expert-response&id=${request._id}&token=${request.responseToken}`;
}

export async function sendReferralRequestEmail(request) {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      status: "Not Configured",
      error: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in .env."
    };
  }

  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });

  const link = referralResponseLink(request);
  const resume = referralResumeLink(request);
  const alumni = request.alumni;
  const subject = `Surana College referral request for ${request.studentName}`;
  const text = [
    `Dear ${alumni.fullName},`,
    "",
    "Surana College has requested your support for a current student referral.",
    "",
    `Student: ${request.studentName}`,
    `Department: ${request.studentDepartment}`,
    `Batch: ${request.studentBatch || "-"}`,
    `Target company: ${request.targetCompany || "-"}`,
    `Target role: ${request.targetRole || "-"}`,
    `Skills: ${request.studentSkills || "-"}`,
    `Resume: ${resume || "-"}`,
    "",
    `Request reason: ${request.requestReason || "-"}`,
    "",
    "Please open the secure link below to accept, decline, ask for more details, or mark that you contacted the student:",
    link,
    "",
    "Regards,",
    "Surana College CampusBridge"
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <h2>Surana College Referral Request</h2>
      <p>Dear ${escapeHtml(alumni.fullName)},</p>
      <p>Surana College has requested your support for a current student referral.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${row("Student", request.studentName)}
        ${row("Department", request.studentDepartment)}
        ${row("Batch", request.studentBatch || "-")}
        ${row("Target company", request.targetCompany || "-")}
        ${row("Target role", request.targetRole || "-")}
        ${row("Skills", request.studentSkills || "-")}
        ${row("Resume", request.resumeOriginalName || resume || "-")}
      </table>
      <p><strong>Request reason:</strong> ${escapeHtml(request.requestReason || "-")}</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">
          Respond to Referral Request
        </a>
      </p>
      <p>If the button does not open, copy this link:</p>
      <p>${link}</p>
      <p>Regards,<br/>Surana College CampusBridge</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Surana College CampusBridge <no-reply@suranacollege.edu.in>",
      to: alumni.email,
      subject,
      text,
      html
    });

    return { sent: true, status: "Sent", error: "" };
  } catch (error) {
    return { sent: false, status: "Failed", error: error.message };
  }
}

export async function sendExpertRequestEmail(request) {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      status: "Not Configured",
      error: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in .env."
    };
  }

  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined
  });

  const link = expertResponseLink(request);
  const alumni = request.alumni;
  const subject = `Surana College ${request.requestType} invitation: ${request.title}`;
  const proposedDate = request.proposedDate ? new Date(request.proposedDate).toLocaleString("en-IN") : "-";
  const text = [
    `Dear ${alumni.fullName},`,
    "",
    `Surana College has requested your support for a ${request.requestType}.`,
    "",
    `Title: ${request.title}`,
    `Department: ${request.department}`,
    `Audience: ${request.audience}`,
    `Proposed date: ${proposedDate}`,
    `Duration: ${request.duration || "-"}`,
    `Mode: ${request.mode || "-"}`,
    `Topic: ${request.topic || "-"}`,
    "",
    `Details: ${request.requestDetails || "-"}`,
    "",
    "Please open the secure link below to accept, decline, or ask for more details:",
    link,
    "",
    "Regards,",
    "Surana College CampusBridge"
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <h2>Surana College ${escapeHtml(request.requestType)} Request</h2>
      <p>Dear ${escapeHtml(alumni.fullName)},</p>
      <p>Surana College has requested your support for a ${escapeHtml(request.requestType)}.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        ${row("Title", request.title)}
        ${row("Department", request.department)}
        ${row("Audience", request.audience)}
        ${row("Proposed date", proposedDate)}
        ${row("Duration", request.duration || "-")}
        ${row("Mode", request.mode || "-")}
        ${row("Topic", request.topic || "-")}
      </table>
      <p><strong>Details:</strong> ${escapeHtml(request.requestDetails || "-")}</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;font-weight:700">
          Respond to ${escapeHtml(request.requestType)} Request
        </a>
      </p>
      <p>If the button does not open, copy this link:</p>
      <p>${link}</p>
      <p>Regards,<br/>Surana College CampusBridge</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Surana College CampusBridge <no-reply@suranacollege.edu.in>",
      to: alumni.email,
      subject,
      text,
      html
    });

    return { sent: true, status: "Sent", error: "" };
  } catch (error) {
    return { sent: false, status: "Failed", error: error.message };
  }
}

function row(label, value) {
  return `
    <tr>
      <td style="border:1px solid #dbe3ea;padding:8px 10px;font-weight:700">${escapeHtml(label)}</td>
      <td style="border:1px solid #dbe3ea;padding:8px 10px">${escapeHtml(value)}</td>
    </tr>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
