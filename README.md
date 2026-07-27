# SMARTNUTRI-AI: Clinical Pediatric Nutrition Station

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v7.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.8-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini API](https://img.shields.io/badge/AI-Google_Gemini_API-8E44AD?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

**SMARTNUTRI-AI** is an advanced, full-stack clinical pediatric nutrition management station. Designed for pediatric nutritionists, clinical dietitians, and parents, the platform bridges the gap between clinical guidance and home execution through automated nutrition rules enforcement, AI-powered meal analysis & 7-day plan generation, real-time consultation mode, and continuous growth monitoring.

🌐 **Live Web Application**: [https://smartnutri-ai-xmn9.vercel.app](https://smartnutri-ai-xmn9.vercel.app)  
🔌 **Live API Service**: [https://smartnutri-ai-ir4p.onrender.com](https://smartnutri-ai-ir4p.onrender.com)

---

## 🚀 Key Features

### 🩺 For Nutritionists & Clinicians
- **Universal ADIME Clinical Charting**: Standardized intake and evaluation workflow supporting Assessment, Diagnosis (PES statements), Intervention, Monitoring, and Evaluation.
- **AI 7-Day Meal Plan Generator**: Automated generation of age-adjusted, allergen-filtered, 7-day pediatric meal plans powered by Google Gemini API.
- **Clinical Rules Engine**: Automated enforcement and monitoring of 14 clinical categories (Macronutrients, Iron, Calcium, Fiber, Sodium, Sugar limits, and Allergen restrictions).
- **Portion Planning Matrix**: Custom meal-by-meal food group breakdown (Vegetables, Fruits, Milk, Rice/Grains, Meat/Protein, Fats, Sugar) with reusable clinical templates.
- **Synchronized Consultation Mode**: Real-time interactive session UI (via WebSockets/Socket.io) enabling seamless clinician-parent interaction during appointments.
- **Pediatric Growth Trajectory**: Interactive WHO growth chart plotting height-for-age, weight-for-age, and BMI progression.
- **Client & Notes Management**: Dedicated portal to manage active pediatric profiles, pin clinical observations, and track parent compliance.

### 👶 For Parents & Caregivers
- **Child Profile Management**: Maintain detailed pediatric profiles including medical history, allergies, food intolerances, and current dietary targets.
- **Smart Meal Logging & AI Vision**: Photo-based meal logging with instant Google Gemini Vision analysis of food components, estimated portion sizes, and compliance warnings.
- **Adherence & Daily Tracking**: Daily logging of water intake, bowel movements (Bristol Stool Scale), supplements, physical activity, and checklist meal completion.
- **AI Kitchen & Recipe Finder**: Interactive database of child-friendly recipes with full nutritional breakdowns and allergen filters.
- **Digital Immunization Tracker**: Log and monitor vaccination schedules alongside physical growth metrics.

### 🛡️ For Administrators
- **User Oversight & Verification**: Credential review and verification for registering nutritionists (license verification, status toggling, account suspension).
- **Audit Logging & Telemetry**: Comprehensive, filterable security and operational audit trail tracking platform-wide actions.
- **Maintenance & Announcement Control**: Broadcast system-wide notices and manage platform operational states.

---

## 🛠️ Tech Stack

| Domain | Technologies | Purpose |
|---|---|---|
| **Frontend Framework** | React 19, Vite 7 | Fast Single Page Application (SPA) with HMR |
| **Styling & UI** | Tailwind CSS v4, Emotion, MUI v7 | Utility-first styling & clinical UI components |
| **Icons & Media** | Lucide React, MUI Icons | Accessible, high-contrast iconography |
| **Data Visualization** | Recharts | Interactive growth curves & macro adherence charts |
| **Rich Text Editor** | Quill / react-quill-new | Structured ADIME charting & clinical note taking |
| **PDF & Reports** | jsPDF, html2canvas | Exporting formatted clinical reports and meal plans |
| **Real-Time Communication**| Socket.io, Socket.io-Client | Synchronized consultation room state |
| **Backend Framework** | Node.js, Express 5 | RESTful API backend architecture |
| **Database & ORM** | PostgreSQL, Prisma ORM (v7.8) | Relational database schema management & migrations |
| **Authentication & Auth** | JSON Web Tokens (JWT), bcryptjs | Secure role-based session management |
| **Artificial Intelligence** | Google Gemini API (1.5 Flash / Pro) | Image vision analysis, meal generation & scoring |
| **Media Management** | Cloudinary, Multer | Cloud storage for meal log images & profile media |
| **Mailer** | Nodemailer | Password resets and automated ticket support |
| **Security Hardening** | Helmet, express-rate-limit | HTTP headers security & IP rate limiting |

---

## 🗂️ Project Structure

```
SMARTNUTRI-AI/
├── client/                     # React 19 Frontend App (Vite)
│   ├── src/
│   │   ├── admin/             # Admin oversight components
│   │   ├── assets/            # Static images & branding assets
│   │   ├── components/        # Shared UI components & layout containers
│   │   ├── constants/         # App constants, food guides, RDA benchmarks
│   │   ├── context/           # React contexts (AuthContext, ThemeContext)
│   │   ├── lib/               # Utility wrappers (Axios client)
│   │   ├── pages/             # Page components (Dashboards, AI Kitchen, Charting)
│   │   └── utils/             # Helper functions (calculators, date formatting)
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express 5 Node.js API Backend
│   ├── data/                  # Standard reference datasets (e.g. food tables)
│   ├── lib/                   # Database client (Prisma), Mailer, Gemini helper
│   ├── middleware/            # JWT authentication, role verification
│   ├── prisma/                # Database schema (schema.prisma) & migrations
│   ├── routes/                # API Endpoints (/auth, /meals, /nutritionist, etc.)
│   ├── services/              # AI Service wrappers & compliance calculators
│   └── package.json
│
├── env_config.js               # Centralized Environment & URL Switch Config
├── SYSTEM_HISTORY_AND_UPDATES.html # Changelog & version release notes
└── package.json                # Workspace root package configuration
```

---

## 🚀 Getting Started

### Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v15.0 or higher (or a cloud PostgreSQL instance like Supabase/Neon)
- **Google Gemini API Key**: [Get API Key](https://aistudio.google.com/)
- **Cloudinary Account**: [Cloudinary Console](https://cloudinary.com/)

---

### Installation & Local Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/SMARTNUTRI-AI.git
   cd SMARTNUTRI-AI
   ```

2. **Install Workspace Dependencies**
   Install all dependencies for root, client, and server workspaces in a single step:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file inside the `server/` directory:
   ```bash
   cp server/.env.example server/.env   # or create manually
   ```

   Fill in the required environment variables in `server/.env`:
   ```env
   # Database connection string
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/smartnutri_db?schema=public"

   # Server configuration
   PORT=5000
   NODE_ENV="development"
   JWT_SECRET="your-super-secret-jwt-key"

   # AI Integration
   GEMINI_API_KEY="your-google-gemini-api-key"

   # Media Upload (Cloudinary)
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"

   # Support Email (SMTP / Nodemailer)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SUPPORT_EMAIL="snutri244@gmail.com"
   ```

4. **Initialize Database with Prisma**
   Generate Prisma Client and apply migrations to your local PostgreSQL instance:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   cd ..
   ```

5. **Run the Development Environment**
   Start both the React frontend and Node.js backend concurrently from the root folder:
   ```bash
   npm run dev
   ```

   - **Frontend UI**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`
   - **Health Check**: `http://localhost:5000/api/health`

---

## 🗄️ Database Schema Overview

The relational database architecture built with Prisma ORM includes the following primary entities:

- `users` — User accounts supporting roles (`parent`, `nutritionist`, `admin`) with authorization flags.
- `profiles` — Child clinical profiles linked to parent users, storing growth records, targets, and medical history.
- `adime_notes` — Clinical records structured around the ADIME process.
- `nutrition_rules` — Custom and standard nutrition limits/rules assigned by nutritionists.
- `meal_logs` — Parent-submitted meal logs containing photos, AI analysis results, and compliance scores.
- `meal_plans` — Scheduled meal prescriptions with target macros and recipe identifiers.
- `meal_plan_templates` — Reusable weekly meal templates created by nutritionists.
- `portion_plans` & `portion_templates` — Structured food category portion guidelines per meal type.
- `growth_logs` — Historical record of child height, weight, and date measurements.
- `daily_adherence_logs` — Granular tracking of meal adherence across food groups.
- `audit_logs` & `announcements` — Administrative oversight and communication records.

---

## 🤖 AI Integration

SMARTNUTRI-AI incorporates Google Gemini API across key clinical workflows:

1. **Meal Photo Vision Analysis**: Converts meal pictures into detailed nutrition estimates (calories, protein, carbs, fat, sodium), flags prohibited ingredients based on child profile rules, and generates a visual compliance score.
2. **7-Day Meal Plan Generation**: Produces complete 7-day meal schedules customized to child age, growth targets, dietary restrictions, and nutritionist preferences.
3. **Recipe Recommendation Engine**: Dynamically matches available ingredients and parental preferences into balanced pediatric recipes.

---

## 🔐 Security & Compliance

- **Authentication**: JWT token validation stored in secure HTTP-only cookies.
- **Authorization**: Strict role-based middleware guarding `/api/admin`, `/api/nutritionist`, and `/api/profiles`.
- **Data Protection**: Sensitive health details supported by privacy mode options and anonymization support for clinical research exporting.
- **Rate Limiting**: Protected public endpoints (such as ticket submission and login) against abuse using `express-rate-limit`.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
