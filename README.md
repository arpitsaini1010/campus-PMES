# Campus Project Management & Evaluation System (Campus PMES)

> **MERN-Based Academic Project Lifecycle Management Platform**  
> Developed for: **School of Computer Applications, Career Point University, Kota**  
> **Student:** Arpit Saini (BCA Capstone Project)  

---

## 📖 Overview

**Campus PMES** is a role-based full-stack web application designed to centralize and automate the academic capstone project workflow for universities. It replaces fragmented spreadsheets, manual paperwork, and untracked messaging with a single controlled system encompassing **Students**, **Faculty Supervisors**, and **Administrators**.

---

## ✨ Key Features & Capabilities

### 1. Three Role-Based Portals (RBAC)
- 🎓 **Student Portal**:
  - Institutional login with University Enrollment No / Email.
  - Project registration (starts in `Draft`) and team formation (1 to 4 members).
  - Enforces single active project constraint per student (BR-03).
  - Document submission (`proposal`, `progress`, and `final` formats: PDF, DOCX, ZIP ≤ 5 MB).
  - Rejection revision loop: return to `Draft`, edit team/metadata, and resubmit.
  - View supervisor feedback and final rubric marks once evaluated.

- 👨‍🏫 **Faculty Portal**:
  - Secure institutional account provisioned by Administrator.
  - Dedicated dashboard with assigned courses/semesters, subject-wise marks, and assignments.
  - **HOD Guide Allocation Module**: Department Head assigns faculty guides to student-proposed group projects, approves projects, and can act as a guide.
  - Proposal review: **Approve** (transitions immediately to `In Progress`) or **Reject** with mandatory written reason.
  - Provide dated, written feedback on student submissions.
  - Criteria-based final evaluation using the university's 100-mark rubric:
    - **Project Report & Documentation:** 30 Marks
    - **Implementation & Code Quality:** 40 Marks
    - **Presentation & Slides:** 20 Marks
    - **Viva Voce & Demonstration:** 10 Marks
    - **Total:** 100 Marks (automatically calculated server-side).

- 🛡️ **Administrator Portal**:
  - Pre-seeded initial admin account via environment variables.
  - Master Department, Subject, and Course Administration.
  - Faculty and Student account provisioning, CSV bulk import, and enrollment number generator.
  - User directory with role filtering, account deactivation toggle, and safe deletion.
  - Project category management (Web, AI/ML, Cloud, IoT, Mobile, etc.) with dependency checks.
  - Campus-wide project monitoring and announcements broadcast.

---

## 🔄 Project Lifecycle Workflow

```
[Draft]
   └── (Student submits proposal with assigned supervisor)
           ▼
[Proposal Submitted]
   ├── (Supervisor rejects with reason) ──► [Rejected] ──► (Leader returns to Draft & revises)
   └── (Supervisor approves) 
           ▼
[In Progress]
   ├── (Student uploads progress updates + Supervisor feedback)
   └── (Student submits final project deliverable)
           ▼
[Final Submitted]
   └── (Supervisor completes 100-mark rubric evaluation)
           ▼
[Evaluated]
   └── (Marks & remarks become visible to students)
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Bootstrap 5, Bootstrap Icons, Axios, React Router v7 |
| **Backend** | Node.js (LTS), Express.js, REST API Architecture |
| **Database** | MongoDB Atlas / Local MongoDB (with automatic in-memory fallback for zero-config demonstration) |
| **Authentication** | JWT (JSON Web Tokens) with 24h validity, Passwords hashed with bcryptjs |
| **File Storage** | Multer memory storage & MongoDB binary buffer streams ($\le$ 5 MB, PDF/DOCX/ZIP) |
| **Hosting** | Microsoft Azure App Service (Single unified Express service serving client build) |

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js (v18+ LTS or v20+)
- npm (v9+)
- (Optional) MongoDB Atlas Connection String (fallback memory-server is provided automatically)

### 1. Install Dependencies
```bash
# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

### 2. Environment Configuration
Create or edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campus_pmes?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret_key_2026
ADMIN_EMAIL=admin@cpur.in
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_NAME=System Administrator
CLIENT_URL=http://localhost:5173
```

### 3. Seed Database
Initialize the default administrator account and categories:
```bash
npm run seed
```

### 4. Run the Development Server
Open two terminals or run:
```bash
# Terminal 1 - Backend Server (Port 5000)
cd server
npm run dev

# Terminal 2 - Frontend Client (Port 5173)
cd client
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Acceptance Testing

A comprehensive automated test suite validates acceptance criteria **AC-01 through AC-08**:
```bash
npm test
```
The test suite executes the full end-to-end lifecycle:
1. Public student registration
2. Admin faculty creation & supervisor assignment
3. Student project creation & team limits
4. Document upload with size/type validation
5. Rejection with mandatory reason & student revision
6. Proposal approval -> automatic In Progress transition
7. Progress updates & written feedback
8. Final deliverable submission
9. Rubric boundary enforcement and total marks calculation
10. Role privacy and student marks revelation post-evaluation

---

## ☁️ Render Cloud Deployment (Step-by-Step)

Campus PMES is built to deploy seamlessly on **[Render](https://render.com)** as a unified full-stack Node.js Web Service:

### Method 1: Automatic Blueprint (Easiest)
1. Push your repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository. Render reads `render.yaml` automatically and configures all build and runtime settings!
5. In the Environment Variables settings, fill in your `MONGO_URI`.

### Method 2: Manual Web Service Setup
1. On Render, click **New +** -> **Web Service**.
2. Select your GitHub repository.
3. Configure the following fields:
   - **Name**: `campus-pmes`
   - **Region**: Singapore or nearest to your users
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/campus_pmes?retryWrites=true&w=majority`
   - `JWT_SECRET`: `(any random secure 32+ character string)`
   - `ADMIN_EMAIL`: `admin@cpur.in`
   - `ADMIN_PASSWORD`: `(your chosen secure admin password)`
   - `ADMIN_NAME`: `System Administrator`
5. Click **Create Web Service**.
6. Render will automatically build the React Vite bundle, install all backend packages, connect to MongoDB Atlas, ensure the default admin account exists, and serve the application on your Render URL!

---

## ☁️ Azure / Self-Hosted Deployment
