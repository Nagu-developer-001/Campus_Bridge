# CampusBridge: Surana College Alumni Management System

A MERN project for Surana College to collect alumni details, search alumni by department and batch, invite alumni for expert talks/FDPs, and connect current students with alumni for referrals.

## Features

- Public alumni registration form link
- Department admin dashboard
- Department-scoped alumni search
- Search by batch, sector, skill, topic, expert talk availability, and FDP availability
- Referral request creation between current students and alumni
- Secure no-login alumni response link for accepting/declining referral requests
- Surana College demo dataset with 10 alumni and 10 referral requests

## Tech Stack

- MongoDB
- Express.js
- React.js
- Node.js

## Run The Project

1. Install MongoDB and keep it running locally.
2. Copy `.env.example` to `.env`.
3. Install dependencies:

```bash
npm.cmd install
```

4. Start the app:

```bash
npm.cmd run dev
```

Frontend: `http://127.0.0.1:5173`

Backend API: `http://127.0.0.1:5000/api/alumni`

## Jenkins CI Setup

This project includes a `Jenkinsfile` for continuous integration.

### Jenkins Prerequisites

- Jenkins installed and running
- Git installed on the Jenkins machine
- Node.js 20 or newer installed on the Jenkins agent
- A Git repository containing this project

### Create Pipeline Job

1. Push this project to GitHub, GitLab, or another Git server.
2. Open Jenkins.
3. Select `New Item`.
4. Enter a job name such as `CampusBridge-CI`.
5. Select `Pipeline`.
6. In `Pipeline` configuration, choose `Pipeline script from SCM`.
7. Select `Git`.
8. Add your repository URL.
9. Set the branch, for example `main`.
10. Set Script Path as:

```text
Jenkinsfile
```

11. Save and click `Build Now`.

### What Jenkins Checks

The pipeline performs:

- Dependency installation with `npm ci`
- Backend JavaScript syntax checks
- Frontend production build with `npm run build`
- Build artifact archiving for `client/dist`

### Environment Notes

The CI pipeline does not send emails or seed MongoDB by default. SMTP values, MongoDB connection strings, and production secrets should be configured in Jenkins credentials or deployment environment variables, not committed to Git.

## Load Surana College Demo Data

Keep MongoDB running, then run:

```bash
npm.cmd run seed
```

This loads:

- 10 Surana College alumni records
- 10 student-alumni referral requests
- Mixed referral statuses such as accepted, declined, viewed, sent, and student contacted

## Important Links

Admin dashboard:

```text
http://127.0.0.1:5173/
```

Alumni registration form:

```text
http://127.0.0.1:5173/?page=alumni-form
```

## Alumni Fields

- Full name
- Email
- Phone
- Graduation year
- Department
- Company name
- Job role
- Skills
- LinkedIn profile
- Location
- Current sector
- Expert talk availability
- FDP availability
- Expertise topics
- Preferred contact method
- Availability notes
