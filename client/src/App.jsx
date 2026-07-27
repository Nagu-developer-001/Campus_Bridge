import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:5000/api/alumni";
const REFERRAL_API_URL = "http://127.0.0.1:5000/api/referrals";
const EXPERT_API_URL = "http://127.0.0.1:5000/api/expert-requests";
const AUTH_API_URL = "http://127.0.0.1:5000/api/auth";
const ADMIN_SESSION_KEY = "campusbridgeAdminSession";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  graduationYear: "",
  department: "",
  companyName: "",
  jobRole: "",
  skills: "",
  linkedinProfile: "",
  location: "",
  currentSector: "",
  availableForExpertTalk: false,
  availableForFdp: false,
  expertiseTopics: "",
  contactPreference: "Email",
  availabilityNotes: ""
};

const emptyFilters = {
  search: "",
  graduationYear: "",
  currentSector: "",
  availableForExpertTalk: false,
  availableForFdp: false
};

const emptyReferralForm = {
  studentName: "",
  studentEmail: "",
  studentPhone: "",
  studentBatch: "",
  targetCompany: "",
  targetRole: "",
  studentSkills: "",
  requestReason: "",
  alumni: ""
};

const emptyExpertRequestForm = {
  requestType: "Expert Talk",
  title: "",
  audience: "Students",
  proposedDate: "",
  duration: "",
  mode: "Offline",
  topic: "",
  requestDetails: "",
  alumni: ""
};

const sectorOptions = ["Industry", "Teaching", "Government", "Higher Studies", "Entrepreneurship", "Other"];
const contactOptions = ["Email", "Phone", "WhatsApp", "LinkedIn"];
const expertRequestTypeOptions = ["Expert Talk", "FDP"];
const expertAudienceOptions = ["Students", "Faculty", "Students and Faculty"];
const expertModeOptions = ["Online", "Offline", "Hybrid"];
const referralStatusOptions = [
  "Link Generated",
  "Sent to Alumni",
  "Viewed by Alumni",
  "Accepted by Alumni",
  "Declined by Alumni",
  "Need More Details",
  "Student Contacted",
  "Referral Completed",
  "Closed"
];
const expertRequestStatusOptions = [
  "Link Generated",
  "Sent to Alumni",
  "Viewed by Alumni",
  "Accepted by Alumni",
  "Declined by Alumni",
  "Need More Details",
  "Session Scheduled",
  "Completed",
  "Closed"
];

function readAdminSession() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch (error) {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

function authHeaders(adminSession) {
  return adminSession?.token ? { Authorization: `Bearer ${adminSession.token}` } : {};
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const isAlumniFormPage = page === "alumni-form";
  const isReferralResponsePage = page === "referral-response";
  const isExpertResponsePage = page === "expert-response";

  if (isReferralResponsePage) {
    return <ReferralResponsePage requestId={params.get("id")} token={params.get("token")} />;
  }

  if (isExpertResponsePage) {
    return <ExpertResponsePage requestId={params.get("id")} token={params.get("token")} />;
  }

  return isAlumniFormPage ? <AlumniRegistrationPage /> : <DepartmentAdminPage />;
}

function AdminLoginPage({ onLogin, notice }) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(notice || "");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to login");
      }

      onLogin({ token: data.token, admin: data.admin });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell login-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Surana College CampusBridge</p>
          <h1>Department Admin Login</h1>
          <p className="subtitle">
            Sign in with your registered department admin account. The dashboard, alumni search, and referral tracker will
            automatically open only for your department.
          </p>
        </div>
      </section>

      <section className="panel login-card">
        <div>
          <h2>Admin Access</h2>
          <p className="section-note">Use the credentials assigned to your Surana College department.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Admin Email
            <input name="email" type="email" value={credentials.email} onChange={handleChange} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={credentials.password} onChange={handleChange} required />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}

function DepartmentAdminPage() {
  const [alumni, setAlumni] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [expertRequests, setExpertRequests] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [referralForm, setReferralForm] = useState(emptyReferralForm);
  const [referralResumeFile, setReferralResumeFile] = useState(null);
  const [referralStatusFilter, setReferralStatusFilter] = useState("");
  const [expertRequestForm, setExpertRequestForm] = useState(emptyExpertRequestForm);
  const [expertStatusFilter, setExpertStatusFilter] = useState("");
  const [expertTypeFilter, setExpertTypeFilter] = useState("");
  const [adminSession, setAdminSession] = useState(readAdminSession);
  const [sessionNotice, setSessionNotice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const alumniFormLink = `${window.location.origin}${window.location.pathname}?page=alumni-form`;
  const admin = adminSession?.admin;
  const adminDepartment = admin?.department || "";

  const stats = useMemo(
    () => ({
      total: alumni.length,
      expertTalk: alumni.filter((record) => record.availableForExpertTalk).length,
      fdp: alumni.filter((record) => record.availableForFdp).length,
      teaching: alumni.filter((record) => record.currentSector === "Teaching").length
    }),
    [alumni]
  );

  const referralStats = useMemo(
    () => ({
      total: referrals.length,
      accepted: referrals.filter((request) => request.status === "Accepted by Alumni").length,
      pending: referrals.filter((request) =>
        ["Link Generated", "Sent to Alumni", "Viewed by Alumni", "Need More Details"].includes(request.status)
      ).length
    }),
    [referrals]
  );

  const expertRequestStats = useMemo(
    () => ({
      total: expertRequests.length,
      accepted: expertRequests.filter((request) => request.status === "Accepted by Alumni").length,
      scheduled: expertRequests.filter((request) => request.status === "Session Scheduled").length
    }),
    [expertRequests]
  );

  async function loadAlumni(nextFilters = filters) {
    if (!adminSession?.token) {
      setAlumni([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: authHeaders(adminSession)
      });
      if (response.status === 401) {
        handleLogout("Your admin session expired. Please log in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load alumni records.");
      }
      setAlumni(data);
      setMessage("");
    } catch (error) {
      setMessage("Unable to load alumni records. Check whether the server is running.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReferrals(status = referralStatusFilter) {
    if (!adminSession?.token) {
      setReferrals([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const response = await fetch(`${REFERRAL_API_URL}?${params.toString()}`, {
        headers: authHeaders(adminSession)
      });
      if (response.status === 401) {
        handleLogout("Your admin session expired. Please log in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load referral requests.");
      }
      setReferrals(data);
    } catch (error) {
      setMessage("Unable to load referral requests.");
    }
  }

  async function loadExpertRequests(status = expertStatusFilter, requestType = expertTypeFilter) {
    if (!adminSession?.token) {
      setExpertRequests([]);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (requestType) params.set("requestType", requestType);
      const response = await fetch(`${EXPERT_API_URL}?${params.toString()}`, {
        headers: authHeaders(adminSession)
      });
      if (response.status === 401) {
        handleLogout("Your admin session expired. Please log in again.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load Expert/FDP requests.");
      }
      setExpertRequests(data);
    } catch (error) {
      setMessage("Unable to load Expert/FDP requests.");
    }
  }

  useEffect(() => {
    if (!adminSession?.token) return;
    loadAlumni(emptyFilters);
    loadReferrals("");
    loadExpertRequests("", "");
  }, [adminSession?.token]);

  function handleAdminLogin(nextSession) {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession));
    localStorage.removeItem("campusbridgeAdminDepartment");
    setAdminSession(nextSession);
    setSessionNotice("");
    setMessage("");
    setFilters(emptyFilters);
    setReferralForm(emptyReferralForm);
    setReferralStatusFilter("");
    setExpertRequestForm(emptyExpertRequestForm);
    setExpertStatusFilter("");
    setExpertTypeFilter("");
  }

  function handleLogout(notice = "") {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminSession(null);
    setAlumni([]);
    setReferrals([]);
    setExpertRequests([]);
    setReferralForm(emptyReferralForm);
    setReferralResumeFile(null);
    setExpertRequestForm(emptyExpertRequestForm);
    setMessage("");
    setSessionNotice(notice);
  }

  function handleFilterChange(event) {
    const { checked, name, type, value } = event.target;
    setFilters((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    loadAlumni(filters);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    loadAlumni(emptyFilters);
  }

  function handleReferralChange(event) {
    const { name, value } = event.target;
    setReferralForm((current) => ({ ...current, [name]: value }));
  }

  function handleReferralFileChange(event) {
    setReferralResumeFile(event.target.files?.[0] || null);
  }

  function startReferral(record) {
    setReferralForm((current) => ({
      ...current,
      alumni: record._id,
      targetCompany: record.companyName || current.targetCompany,
      targetRole: record.jobRole || current.targetRole
    }));
    document.querySelector("#referral-panel")?.scrollIntoView({ behavior: "smooth" });
  }

  function startExpertRequest(record, requestType = "Expert Talk") {
    setExpertRequestForm((current) => ({
      ...current,
      requestType,
      alumni: record._id,
      title: current.title || `${requestType} by ${record.fullName}`,
      topic: record.expertiseTopics || record.skills || current.topic
    }));
    document.querySelector("#expert-request-panel")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleExpertRequestChange(event) {
    const { name, value } = event.target;
    setExpertRequestForm((current) => ({ ...current, [name]: value }));
  }

  async function handleReferralSubmit(event) {
    event.preventDefault();
    if (!adminDepartment.trim()) {
      setMessage("Set the admin department before creating a referral request.");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries({
        ...referralForm,
        studentDepartment: adminDepartment.trim(),
        studentBatch: referralForm.studentBatch ? Number(referralForm.studentBatch) : ""
      }).forEach(([key, value]) => formData.append(key, value ?? ""));
      if (referralResumeFile) {
        formData.append("resumeFile", referralResumeFile);
      }

      const response = await fetch(REFERRAL_API_URL, {
        method: "POST",
        headers: authHeaders(adminSession),
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create referral request");
      }

      setMessage(
        data.emailDeliveryStatus === "Sent"
          ? "Referral request created and email sent to alumni automatically."
          : `Referral request created. Email not sent: ${data.emailError || data.emailDeliveryStatus}`
      );
      setReferralForm(emptyReferralForm);
      setReferralResumeFile(null);
      loadReferrals(referralStatusFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleExpertRequestSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(EXPERT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(adminSession) },
        body: JSON.stringify(expertRequestForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to create Expert/FDP request");
      }

      setMessage(
        data.emailDeliveryStatus === "Sent"
          ? "Expert/FDP request created and email sent to alumni automatically."
          : `Expert/FDP request created. Email not sent: ${data.emailError || data.emailDeliveryStatus}`
      );
      setExpertRequestForm(emptyExpertRequestForm);
      loadExpertRequests(expertStatusFilter, expertTypeFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateReferralStatus(id, status) {
    try {
      const response = await fetch(`${REFERRAL_API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(adminSession) },
        body: JSON.stringify({ status })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update referral");
      }

      setMessage("Referral status updated.");
      loadReferrals(referralStatusFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function sendReferralEmail(id) {
    try {
      const response = await fetch(`${REFERRAL_API_URL}/${id}/send-email`, {
        method: "POST",
        headers: authHeaders(adminSession)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send referral email");
      }

      setMessage(
        data.emailDeliveryStatus === "Sent"
          ? "Referral email sent to alumni."
          : `Referral email not sent: ${data.emailError || data.emailDeliveryStatus}`
      );
      loadReferrals(referralStatusFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateExpertRequestStatus(id, status) {
    try {
      const response = await fetch(`${EXPERT_API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(adminSession) },
        body: JSON.stringify({ status })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update Expert/FDP request");
      }

      setMessage("Expert/FDP request status updated.");
      loadExpertRequests(expertStatusFilter, expertTypeFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function sendExpertRequestEmail(id) {
    try {
      const response = await fetch(`${EXPERT_API_URL}/${id}/send-email`, {
        method: "POST",
        headers: authHeaders(adminSession)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send Expert/FDP email");
      }

      setMessage(
        data.emailDeliveryStatus === "Sent"
          ? "Expert/FDP email sent to alumni."
          : `Expert/FDP email not sent: ${data.emailError || data.emailDeliveryStatus}`
      );
      loadExpertRequests(expertStatusFilter, expertTypeFilter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleReferralStatusFilterChange(event) {
    const status = event.target.value;
    setReferralStatusFilter(status);
    loadReferrals(status);
  }

  function handleExpertStatusFilterChange(event) {
    const status = event.target.value;
    setExpertStatusFilter(status);
    loadExpertRequests(status, expertTypeFilter);
  }

  function handleExpertTypeFilterChange(event) {
    const requestType = event.target.value;
    setExpertTypeFilter(requestType);
    loadExpertRequests(expertStatusFilter, requestType);
  }

  if (!adminSession?.token) {
    return <AdminLoginPage onLogin={handleAdminLogin} notice={sessionNotice} />;
  }

  return (
    <main className="app-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Surana College CampusBridge</p>
          <h1>Department Alumni Dashboard</h1>
          <p className="subtitle">
            Surana College department admins can view dashboards and search alumni only for their registered department.
          </p>
        </div>
        <span className="count-badge">{adminDepartment} - {alumni.length} records</span>
      </section>

      <section className="panel admin-scope-panel">
        <div>
          <h2>{adminDepartment} Admin Access</h2>
          <p className="section-note">
            Dashboard counts, alumni search, and referral requests are locked to the department registered with this admin
            account.
          </p>
        </div>
        <div className="session-card">
          <span>Signed in as</span>
          <strong>{admin?.fullName}</strong>
          <p>{admin?.email}</p>
          <button className="ghost-button" type="button" onClick={() => handleLogout("Logged out successfully.")}>
            Logout
          </button>
        </div>
      </section>

      <section className="panel link-panel">
        <div>
          <h2>Surana Alumni Registration Link</h2>
          <p className="section-note">Send this link to Surana College passed-out students. They will see only the registration form.</p>
        </div>
        <input value={alumniFormLink} readOnly onFocus={(event) => event.target.select()} />
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total Alumni</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Expert Talk Ready</span>
          <strong>{stats.expertTalk}</strong>
        </article>
        <article className="stat-card">
          <span>FDP Support</span>
          <strong>{stats.fdp}</strong>
        </article>
        <article className="stat-card">
          <span>Teaching Sector</span>
          <strong>{stats.teaching}</strong>
        </article>
        <article className="stat-card">
          <span>Referral Requests</span>
          <strong>{referralStats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Expert/FDP Requests</span>
          <strong>{expertRequestStats.total}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Search Alumni for Surana College Activities</h2>
            <p className="section-note">Search is restricted to {adminDepartment} alumni.</p>
          </div>
        </div>

        <form className="filter-form" onSubmit={handleSearchSubmit}>
          <input
            name="search"
            placeholder="Search name, company, skill, topic..."
            value={filters.search}
            onChange={handleFilterChange}
          />
          <input
            name="graduationYear"
            type="number"
            placeholder="Batch year"
            value={filters.graduationYear}
            onChange={handleFilterChange}
          />
          <select name="currentSector" value={filters.currentSector} onChange={handleFilterChange}>
            <option value="">All sectors</option>
            {sectorOptions.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
          <label className="check-label compact">
            <input
              name="availableForExpertTalk"
              type="checkbox"
              checked={filters.availableForExpertTalk}
              onChange={handleFilterChange}
            />
            Expert talk
          </label>
          <label className="check-label compact">
            <input name="availableForFdp" type="checkbox" checked={filters.availableForFdp} onChange={handleFilterChange} />
            FDP
          </label>
          <button className="secondary-button" type="submit">
            Search
          </button>
          <button className="ghost-button" type="button" onClick={resetFilters}>
            Reset
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        {loading ? (
          <p className="empty-state">Loading records...</p>
        ) : alumni.length === 0 ? (
          <p className="empty-state">No alumni records found for this department.</p>
        ) : (
          <AlumniTable alumni={alumni} onStartReferral={startReferral} onStartExpertRequest={startExpertRequest} />
        )}
      </section>

      <section id="expert-request-panel" className="panel">
        <div className="section-heading">
          <div>
            <h2>Expert Talk / FDP Request Module</h2>
            <p className="section-note">
              Invite a department alumnus for expert talks, FDP sessions, workshops, or faculty-development activities.
            </p>
          </div>
        </div>

        <form className="expert-request-form" onSubmit={handleExpertRequestSubmit}>
          <label>
            Request Type
            <select name="requestType" value={expertRequestForm.requestType} onChange={handleExpertRequestChange} required>
              {expertRequestTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Selected Alumni
            <select name="alumni" value={expertRequestForm.alumni} onChange={handleExpertRequestChange} required>
              <option value="">Choose alumni</option>
              {alumni.map((record) => (
                <option key={record._id} value={record._id}>
                  {record.fullName} - {record.expertiseTopics || record.companyName || "No topic added"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session Title
            <input name="title" value={expertRequestForm.title} onChange={handleExpertRequestChange} required />
          </label>
          <label>
            Audience
            <select name="audience" value={expertRequestForm.audience} onChange={handleExpertRequestChange}>
              {expertAudienceOptions.map((audience) => (
                <option key={audience} value={audience}>
                  {audience}
                </option>
              ))}
            </select>
          </label>
          <label>
            Proposed Date
            <input name="proposedDate" type="datetime-local" value={expertRequestForm.proposedDate} onChange={handleExpertRequestChange} />
          </label>
          <label>
            Duration
            <input name="duration" placeholder="Example: 90 minutes, half day" value={expertRequestForm.duration} onChange={handleExpertRequestChange} />
          </label>
          <label>
            Mode
            <select name="mode" value={expertRequestForm.mode} onChange={handleExpertRequestChange}>
              {expertModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Topic
            <input name="topic" value={expertRequestForm.topic} onChange={handleExpertRequestChange} />
          </label>
          <label className="full-span">
            Request Details
            <textarea
              name="requestDetails"
              placeholder="Mention expected outcomes, audience profile, preferred format, and any flexibility in date/time."
              value={expertRequestForm.requestDetails}
              onChange={handleExpertRequestChange}
            />
          </label>
          <button className="primary-button" type="submit">
            Create Expert/FDP Request
          </button>
        </form>
      </section>

      <section id="referral-panel" className="panel">
        <div className="section-heading">
          <div>
            <h2>Connect Student with Alumni for Referral</h2>
            <p className="section-note">
              Select a department alumni from the search table, then create a referral request for a currently studying
              student.
            </p>
          </div>
        </div>

        <form className="referral-form" onSubmit={handleReferralSubmit}>
          <label>
            Selected Alumni
            <select name="alumni" value={referralForm.alumni} onChange={handleReferralChange} required>
              <option value="">Choose alumni</option>
              {alumni.map((record) => (
                <option key={record._id} value={record._id}>
                  {record.fullName} - {record.companyName || "No company"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Student Name
            <input name="studentName" value={referralForm.studentName} onChange={handleReferralChange} required />
          </label>
          <label>
            Student Email
            <input name="studentEmail" type="email" value={referralForm.studentEmail} onChange={handleReferralChange} required />
          </label>
          <label>
            Student Phone
            <input name="studentPhone" value={referralForm.studentPhone} onChange={handleReferralChange} />
          </label>
          <label>
            Student Batch
            <input name="studentBatch" type="number" value={referralForm.studentBatch} onChange={handleReferralChange} />
          </label>
          <label>
            Target Company
            <input name="targetCompany" value={referralForm.targetCompany} onChange={handleReferralChange} />
          </label>
          <label>
            Target Role
            <input name="targetRole" value={referralForm.targetRole} onChange={handleReferralChange} />
          </label>
          <label>
            Student Skills
            <input name="studentSkills" value={referralForm.studentSkills} onChange={handleReferralChange} />
          </label>
          <label className="full-span">
            Resume File
            <input accept=".pdf,.doc,.docx" name="resumeFile" type="file" onChange={handleReferralFileChange} />
          </label>
          <label className="full-span">
            Request Reason
            <textarea
              name="requestReason"
              placeholder="Why is this student a good fit? What help is expected from the alumni?"
              value={referralForm.requestReason}
              onChange={handleReferralChange}
            />
          </label>
          <button className="primary-button" type="submit">
            Create Referral Request
          </button>
        </form>
      </section>

      <section className="panel referral-tracker-panel">
        <div className="section-heading">
          <div>
            <h2>Referral Request Tracker</h2>
            <p className="section-note">Track current-student referral requests for {adminDepartment}.</p>
          </div>
          <select className="status-filter" value={referralStatusFilter} onChange={handleReferralStatusFilterChange}>
            <option value="">All statuses</option>
            {referralStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {referrals.length === 0 ? (
          <p className="empty-state">No referral requests found.</p>
        ) : (
          <ReferralTable referrals={referrals} onUpdateStatus={updateReferralStatus} onSendEmail={sendReferralEmail} />
        )}
      </section>

      <section className="panel referral-tracker-panel">
        <div className="section-heading">
          <div>
            <h2>Expert Talk / FDP Request Tracker</h2>
            <p className="section-note">Track alumni invitations for expert sessions and FDP activities for {adminDepartment}.</p>
          </div>
          <div className="tracker-filter-row">
            <select className="status-filter" value={expertTypeFilter} onChange={handleExpertTypeFilterChange}>
              <option value="">All types</option>
              {expertRequestTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select className="status-filter" value={expertStatusFilter} onChange={handleExpertStatusFilterChange}>
              <option value="">All statuses</option>
              {expertRequestStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {expertRequests.length === 0 ? (
          <p className="empty-state">No Expert/FDP requests found.</p>
        ) : (
          <ExpertRequestCards
            requests={expertRequests}
            onSendEmail={sendExpertRequestEmail}
            onUpdateStatus={updateExpertRequestStatus}
          />
        )}
      </section>
    </main>
  );
}

function AlumniRegistrationPage() {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage("Thank you. Your alumni registration has been submitted.");
      setForm(emptyForm);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="app-shell form-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Surana College Alumni</p>
          <h1>Surana College Alumni Registration Form</h1>
          <p className="subtitle">
            Submit your current details so Surana College can contact you for expert talks, FDP sessions, referrals, and
            department activities.
          </p>
        </div>
      </section>

      <section className="panel">
        <form className="alumni-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Phone / WhatsApp
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            Batch / Passed-out Year
            <input
              name="graduationYear"
              type="number"
              min="1950"
              max="2100"
              value={form.graduationYear}
              onChange={handleChange}
            />
          </label>
          <label>
            Department
            <input name="department" placeholder="CSE, ECE, Mechanical..." value={form.department} onChange={handleChange} required />
          </label>
          <label>
            Current Sector
            <select name="currentSector" value={form.currentSector} onChange={handleChange}>
              <option value="">Select sector</option>
              {sectorOptions.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </label>
          <label>
            Company / Institution
            <input name="companyName" value={form.companyName} onChange={handleChange} />
          </label>
          <label>
            Current Role
            <input name="jobRole" placeholder="Software Engineer, Assistant Professor..." value={form.jobRole} onChange={handleChange} />
          </label>
          <label>
            Skills
            <input name="skills" value={form.skills} onChange={handleChange} />
          </label>
          <label>
            Expert Talk / FDP Topics
            <input
              name="expertiseTopics"
              placeholder="AI, Cloud, VLSI, Teaching methodology..."
              value={form.expertiseTopics}
              onChange={handleChange}
            />
          </label>
          <label>
            LinkedIn Profile
            <input name="linkedinProfile" value={form.linkedinProfile} onChange={handleChange} />
          </label>
          <label>
            Location
            <input name="location" value={form.location} onChange={handleChange} />
          </label>
          <label>
            Preferred Contact
            <select name="contactPreference" value={form.contactPreference} onChange={handleChange}>
              {contactOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="check-group">
            <label className="check-label">
              <input
                name="availableForExpertTalk"
                type="checkbox"
                checked={form.availableForExpertTalk}
                onChange={handleChange}
              />
              Available for expert talk
            </label>
            <label className="check-label">
              <input name="availableForFdp" type="checkbox" checked={form.availableForFdp} onChange={handleChange} />
              Available for FDP
            </label>
          </div>
          <label className="full-span">
            Availability Notes
            <textarea
              name="availabilityNotes"
              placeholder="Example: Available on weekends, online sessions preferred, can visit campus once per semester..."
              value={form.availabilityNotes}
              onChange={handleChange}
            />
          </label>
          <button className="primary-button" type="submit">
            Submit Surana Alumni Registration
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}

function ReferralResponsePage({ requestId, token }) {
  const [request, setRequest] = useState(null);
  const [decision, setDecision] = useState("accept");
  const [alumniRemarks, setAlumniRemarks] = useState("");
  const [alumniContactedStudent, setAlumniContactedStudent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequest() {
      if (!requestId || !token) {
        setMessage("This referral response link is incomplete.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${REFERRAL_API_URL}/public/${requestId}?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load referral request");
        }
        setRequest(data);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [requestId, token]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${REFERRAL_API_URL}/public/${requestId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          alumniRemarks,
          alumniContactedStudent
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to submit response");
      }
      setRequest(data);
      setMessage("Your response has been submitted to Surana College.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function resumeDownloadUrl() {
    return `${REFERRAL_API_URL}/public/${requestId}/resume?token=${encodeURIComponent(token)}`;
  }

  return (
    <main className="app-shell form-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Surana College Referral</p>
          <h1>Referral Request Response</h1>
          <p className="subtitle">Review the student request and update Surana College directly. No login is required.</p>
        </div>
      </section>

      {loading ? (
        <p className="empty-state">Loading referral request...</p>
      ) : !request ? (
        <p className="empty-state">{message || "Referral request not found."}</p>
      ) : (
        <>
          <section className="panel response-summary">
            <div>
              <h2>{request.studentName}</h2>
              <p className="section-note">
                {request.studentDepartment} {request.studentBatch ? `- ${request.studentBatch}` : ""} student seeking
                referral support.
              </p>
            </div>
            <span className="count-badge">{request.status}</span>
            <div className="summary-grid">
              <div>
                <strong>Target</strong>
                <span>{request.targetCompany || "-"} / {request.targetRole || "Role not added"}</span>
              </div>
              <div>
                <strong>Skills</strong>
                <span>{request.studentSkills || "Not added"}</span>
              </div>
              <div>
                <strong>Student Contact</strong>
                <span>{request.studentEmail}</span>
                <span>{request.studentPhone || "Phone not added"}</span>
              </div>
              <div>
                <strong>Resume</strong>
                {request.hasResumeFile ? (
                  <a href={resumeDownloadUrl()} target="_blank" rel="noreferrer">
                    {request.resumeOriginalName || "Download resume"}
                  </a>
                ) : (
                  <span>{request.resumeLink || "Resume file not added"}</span>
                )}
              </div>
            </div>
            <div className="request-reason">
              <strong>Surana College Request</strong>
              <p>{request.requestReason || "No additional reason added."}</p>
            </div>
          </section>

          <section className="panel">
            <form className="response-form" onSubmit={handleSubmit}>
              <label>
                Your Response
                <select value={decision} onChange={(event) => setDecision(event.target.value)}>
                  <option value="accept">Accept referral request</option>
                  <option value="decline">Decline referral request</option>
                  <option value="more_details">Need more details</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={alumniContactedStudent}
                  onChange={(event) => setAlumniContactedStudent(event.target.checked)}
                />
                I have contacted the student
              </label>
              <label className="full-span">
                Remarks for Surana College
                <textarea
                  placeholder="Add remarks, next steps, reason for decline, or details needed..."
                  value={alumniRemarks}
                  onChange={(event) => setAlumniRemarks(event.target.value)}
                />
              </label>
              <button className="primary-button" type="submit">
                Submit Response
              </button>
            </form>
            {message && <p className="message">{message}</p>}
          </section>
        </>
      )}
    </main>
  );
}

function ExpertResponsePage({ requestId, token }) {
  const [request, setRequest] = useState(null);
  const [decision, setDecision] = useState("accept");
  const [alumniRemarks, setAlumniRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequest() {
      if (!requestId || !token) {
        setMessage("This Expert/FDP response link is incomplete.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${EXPERT_API_URL}/public/${requestId}?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load Expert/FDP request");
        }
        setRequest(data);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [requestId, token]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${EXPERT_API_URL}/public/${requestId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          alumniRemarks
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to submit response");
      }
      setRequest(data);
      setMessage("Your response has been submitted to Surana College.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="app-shell form-shell">
      <section className="top-bar">
        <div>
          <p className="eyebrow">Surana College Expert/FDP Request</p>
          <h1>Session Invitation Response</h1>
          <p className="subtitle">Review the proposed session and update Surana College directly. No login is required.</p>
        </div>
      </section>

      {loading ? (
        <p className="empty-state">Loading Expert/FDP request...</p>
      ) : !request ? (
        <p className="empty-state">{message || "Expert/FDP request not found."}</p>
      ) : (
        <>
          <section className="panel response-summary">
            <div>
              <h2>{request.title}</h2>
              <p className="section-note">
                {request.requestType} for {request.department} department.
              </p>
            </div>
            <span className="count-badge">{request.status}</span>
            <div className="summary-grid">
              <div>
                <strong>Audience</strong>
                <span>{request.audience}</span>
              </div>
              <div>
                <strong>Schedule</strong>
                <span>{request.proposedDate ? new Date(request.proposedDate).toLocaleString("en-IN") : "Date flexible"}</span>
                <span>{request.duration || "Duration not added"}</span>
              </div>
              <div>
                <strong>Mode</strong>
                <span>{request.mode}</span>
              </div>
              <div>
                <strong>Topic</strong>
                <span>{request.topic || "Topic not added"}</span>
              </div>
            </div>
            <div className="request-reason">
              <strong>Surana College Request</strong>
              <p>{request.requestDetails || "No additional details added."}</p>
            </div>
          </section>

          <section className="panel">
            <form className="response-form" onSubmit={handleSubmit}>
              <label>
                Your Response
                <select value={decision} onChange={(event) => setDecision(event.target.value)}>
                  <option value="accept">Accept request</option>
                  <option value="decline">Decline request</option>
                  <option value="more_details">Need more details</option>
                </select>
              </label>
              <label className="full-span">
                Remarks for Surana College
                <textarea
                  placeholder="Add preferred date/time, session format, reason for decline, or details needed..."
                  value={alumniRemarks}
                  onChange={(event) => setAlumniRemarks(event.target.value)}
                />
              </label>
              <button className="primary-button" type="submit">
                Submit Response
              </button>
            </form>
            {message && <p className="message">{message}</p>}
          </section>
        </>
      )}
    </main>
  );
}

function AlumniTable({ alumni, onStartReferral, onStartExpertRequest }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Alumni</th>
            <th>Batch / Department</th>
            <th>Current Work</th>
            <th>Surana Support</th>
            <th>Expertise</th>
            <th>Contact</th>
            <th>Referral</th>
          </tr>
        </thead>
        <tbody>
          {alumni.map((record) => (
            <tr key={record._id}>
              <td>
                <strong>{record.fullName}</strong>
                <span>{record.location || "Location not added"}</span>
              </td>
              <td>
                {record.graduationYear || "-"}
                <span>{record.department || "Department not added"}</span>
              </td>
              <td>
                {record.companyName || "-"}
                <span>{record.jobRole || "Role not added"}</span>
                <span>{record.currentSector || "Sector not added"}</span>
              </td>
              <td>
                <div className="tag-stack">
                  {record.availableForExpertTalk && <span className="tag">Expert Talk</span>}
                  {record.availableForFdp && <span className="tag">FDP</span>}
                  {!record.availableForExpertTalk && !record.availableForFdp && <span className="muted">Not marked</span>}
                </div>
              </td>
              <td>
                {record.expertiseTopics || record.skills || "-"}
                {record.availabilityNotes && <span>{record.availabilityNotes}</span>}
              </td>
              <td>
                {record.email}
                <span>{record.phone || "Phone not added"}</span>
                <span>{record.contactPreference || "Email"}</span>
              </td>
              <td>
                <div className="row-action-stack">
                  <button className="mini-button" type="button" onClick={() => onStartReferral(record)}>
                    Connect Student
                  </button>
                  <button className="ghost-button mini-action-button" type="button" onClick={() => onStartExpertRequest(record, "Expert Talk")}>
                    Expert Talk
                  </button>
                  <button className="ghost-button mini-action-button" type="button" onClick={() => onStartExpertRequest(record, "FDP")}>
                    FDP
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferralTable({ referrals, onUpdateStatus, onSendEmail }) {
  const [expandedReferralId, setExpandedReferralId] = useState("");

  function responseLink(request) {
    if (!request.responseToken) return "";
    return `${window.location.origin}${window.location.pathname}?page=referral-response&id=${request._id}&token=${request.responseToken}`;
  }

  function resumeLink(request) {
    if (!request.responseToken || !request.resumeFileName) return "";
    return `${REFERRAL_API_URL}/public/${request._id}/resume?token=${request.responseToken}`;
  }

  async function copyResponseLink(request) {
    const link = responseLink(request);
    if (link) await navigator.clipboard.writeText(link);
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString("en-IN") : "";
  }

  function statusClass(status) {
    return String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return (
    <div className="referral-list">
      {referrals.map((request) => {
        const isExpanded = expandedReferralId === request._id;
        const detailsId = `referral-details-${request._id}`;

        return (
          <article className={`referral-card ${isExpanded ? "is-expanded" : ""}`} key={request._id}>
            <button
              aria-controls={detailsId}
              aria-expanded={isExpanded}
              className="referral-summary-button"
              type="button"
              onClick={() => setExpandedReferralId(isExpanded ? "" : request._id)}
            >
              <span className={`status-pill status-${statusClass(request.status)}`}>{request.status}</span>
              <span className="summary-main">
                <strong>{request.studentName}</strong>
                <small>
                  {request.studentBatch || "-"} batch, {request.studentDepartment}
                </small>
              </span>
              <span className="summary-meta">
                <span>{request.targetCompany || "Target not added"}</span>
                <small>{request.targetRole || "Role not added"}</small>
              </span>
              <span className="summary-meta">
                <span>{request.alumni?.fullName || "Alumni removed"}</span>
                <small>{request.alumni?.companyName || "Company not added"}</small>
              </span>
              <span className="summary-email">Email: {request.emailDeliveryStatus || "Pending"}</span>
              <span className="expand-indicator">{isExpanded ? "Hide details" : "View details"}</span>
            </button>

            {isExpanded && (
              <div className="referral-expanded-content" id={detailsId}>
                <div className="referral-detail-toolbar">
                  <div>
                    <h3>{request.studentName}</h3>
                    <p>
                      Full referral request for {request.studentDepartment}, {request.studentBatch || "-"} batch.
                    </p>
                  </div>
                  <label className="status-control">
                    Update Status
                    <select value={request.status} onChange={(event) => onUpdateStatus(request._id, event.target.value)}>
                      {referralStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="referral-card-grid">
                  <section className="referral-info-block">
                    <span className="block-label">Student</span>
                    <strong>{request.studentEmail}</strong>
                    <p>{request.studentSkills || "Skills not added"}</p>
                  </section>
                  <section className="referral-info-block">
                    <span className="block-label">Alumni</span>
                    <strong>{request.alumni?.fullName || "Alumni removed"}</strong>
                    <p>{request.alumni?.companyName || "Company not added"}</p>
                    {request.alumni?.email && <p>{request.alumni.email}</p>}
                  </section>
                  <section className="referral-info-block">
                    <span className="block-label">Target</span>
                    <strong>{request.targetCompany || "-"}</strong>
                    <p>{request.targetRole || "Role not added"}</p>
                  </section>
                </div>

                <div className="referral-request-body">
                  <span className="block-label">Request Reason</span>
                  <p>{request.requestReason || "No request reason added."}</p>
                  {request.resumeFileName ? (
                    <a href={resumeLink(request)} target="_blank" rel="noreferrer">
                      {request.resumeOriginalName || "Download resume"}
                    </a>
                  ) : (
                    <span className="muted">Resume file not uploaded</span>
                  )}
                </div>

                <div className="referral-action-panel">
                  <div className="response-link-box">
                    <span className="block-label">Private Alumni Response Link</span>
                    {request.responseToken ? (
                      <input value={responseLink(request)} readOnly onFocus={(event) => event.target.select()} />
                    ) : (
                      <p className="muted">Link not available for older request</p>
                    )}
                  </div>
                  <div className="referral-actions">
                    <button className="mini-button" type="button" disabled={!request.responseToken} onClick={() => copyResponseLink(request)}>
                      Copy Link
                    </button>
                    <button className="secondary-button" type="button" disabled={!request.responseToken} onClick={() => onSendEmail(request._id)}>
                      Send Email
                    </button>
                  </div>
                </div>

                <div className="referral-timeline">
                  <span>Email: {request.emailDeliveryStatus || "Pending"}</span>
                  {request.emailSentAt && <span>Email sent: {formatDate(request.emailSentAt)}</span>}
                  {request.alumniViewedAt && <span>Viewed: {formatDate(request.alumniViewedAt)}</span>}
                  {request.alumniRespondedAt && <span>Responded: {formatDate(request.alumniRespondedAt)}</span>}
                  {request.studentContactedAt && <span>Student contacted: {formatDate(request.studentContactedAt)}</span>}
                  {request.emailError && <span className="error-text">{request.emailError}</span>}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ExpertRequestCards({ requests, onUpdateStatus, onSendEmail }) {
  const [expandedRequestId, setExpandedRequestId] = useState("");

  function responseLink(request) {
    if (!request.responseToken) return "";
    return `${window.location.origin}${window.location.pathname}?page=expert-response&id=${request._id}&token=${request.responseToken}`;
  }

  async function copyResponseLink(request) {
    const link = responseLink(request);
    if (link) await navigator.clipboard.writeText(link);
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString("en-IN") : "";
  }

  function statusClass(status) {
    return String(status || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return (
    <div className="referral-list">
      {requests.map((request) => {
        const isExpanded = expandedRequestId === request._id;
        const detailsId = `expert-request-details-${request._id}`;

        return (
          <article className={`referral-card ${isExpanded ? "is-expanded" : ""}`} key={request._id}>
            <button
              aria-controls={detailsId}
              aria-expanded={isExpanded}
              className="referral-summary-button"
              type="button"
              onClick={() => setExpandedRequestId(isExpanded ? "" : request._id)}
            >
              <span className={`status-pill status-${statusClass(request.status)}`}>{request.status}</span>
              <span className="summary-main">
                <strong>{request.title}</strong>
                <small>{request.requestType}</small>
              </span>
              <span className="summary-meta">
                <span>{request.alumni?.fullName || "Alumni removed"}</span>
                <small>{request.alumni?.companyName || "Company not added"}</small>
              </span>
              <span className="summary-meta">
                <span>{request.proposedDate ? formatDate(request.proposedDate) : "Date flexible"}</span>
                <small>{request.mode || "Mode not added"}</small>
              </span>
              <span className="summary-email">Email: {request.emailDeliveryStatus || "Pending"}</span>
              <span className="expand-indicator">{isExpanded ? "Hide details" : "View details"}</span>
            </button>

            {isExpanded && (
              <div className="referral-expanded-content" id={detailsId}>
                <div className="referral-detail-toolbar">
                  <div>
                    <h3>{request.title}</h3>
                    <p>
                      {request.requestType} request for {request.department}.
                    </p>
                  </div>
                  <label className="status-control">
                    Update Status
                    <select value={request.status} onChange={(event) => onUpdateStatus(request._id, event.target.value)}>
                      {expertRequestStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="referral-card-grid">
                  <section className="referral-info-block">
                    <span className="block-label">Alumni</span>
                    <strong>{request.alumni?.fullName || "Alumni removed"}</strong>
                    <p>{request.alumni?.email || "Email not added"}</p>
                    <p>{request.alumni?.jobRole || request.alumni?.companyName || "Current work not added"}</p>
                  </section>
                  <section className="referral-info-block">
                    <span className="block-label">Session</span>
                    <strong>{request.requestType}</strong>
                    <p>{request.topic || "Topic not added"}</p>
                    <p>{request.audience}</p>
                  </section>
                  <section className="referral-info-block">
                    <span className="block-label">Schedule</span>
                    <strong>{request.proposedDate ? formatDate(request.proposedDate) : "Date flexible"}</strong>
                    <p>{request.duration || "Duration not added"}</p>
                    <p>{request.mode || "Mode not added"}</p>
                  </section>
                </div>

                <div className="referral-request-body">
                  <span className="block-label">Request Details</span>
                  <p>{request.requestDetails || "No request details added."}</p>
                  {request.alumniRemarks && (
                    <>
                      <span className="block-label response-note-label">Alumni Remarks</span>
                      <p>{request.alumniRemarks}</p>
                    </>
                  )}
                </div>

                <div className="referral-action-panel">
                  <div className="response-link-box">
                    <span className="block-label">Private Alumni Response Link</span>
                    {request.responseToken ? (
                      <input value={responseLink(request)} readOnly onFocus={(event) => event.target.select()} />
                    ) : (
                      <p className="muted">Link not available for older request</p>
                    )}
                  </div>
                  <div className="referral-actions">
                    <button className="mini-button" type="button" disabled={!request.responseToken} onClick={() => copyResponseLink(request)}>
                      Copy Link
                    </button>
                    <button className="secondary-button" type="button" disabled={!request.responseToken} onClick={() => onSendEmail(request._id)}>
                      Send Email
                    </button>
                  </div>
                </div>

                <div className="referral-timeline">
                  <span>Email: {request.emailDeliveryStatus || "Pending"}</span>
                  {request.emailSentAt && <span>Email sent: {formatDate(request.emailSentAt)}</span>}
                  {request.alumniViewedAt && <span>Viewed: {formatDate(request.alumniViewedAt)}</span>}
                  {request.alumniRespondedAt && <span>Responded: {formatDate(request.alumniRespondedAt)}</span>}
                  {request.emailError && <span className="error-text">{request.emailError}</span>}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
