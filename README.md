# SMARTNUTRI-AI: Clinical Pediatric Nutrition Station

SMARTNUTRI-AI is a high-performance clinical workstation designed for pediatric nutritionists. It combines AI-driven meal planning with human-expert overrides, automated nutrition rule enforcement, and high-fidelity patient progress tracking.

## 🚀 Key Features
- **Adaptive Meal Planner**: AI-generated 7-day schedules synced with clinical growth standards.
- **Universal Clinical Toolbar**: Centralized ADIME charting and notation tools.
- **Rules Engine**: Automated enforcement of 14 clinical categories (Macros, Iron, Calcium, Fiber, etc.).
- **Growth Insights**: High-contrast, interactive charts for weight and height tracking.
- **Consultation Mode**: Specialized UI for real-time patient/parent interaction.

---

## 🛠️ Tech Stack
- **Frontend**: React.js, Tailwind CSS (v4), Lucide Icons.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with Prisma ORM.
- **AI Engine**: Google Gemini API.
- **Media**: Cloudinary for meal log analysis.

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** instance.

### 2. Installation
Clone the repository and install dependencies for both client and server:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 3. Environment Configuration
Navigate to the `server` directory and create a `.env` file based on the example:
```bash
cp .env.example .env
```
*Fill in your API keys (Gemini, Edamam, Cloudinary) and your database URL in the `.env` file.*

### 4. Database Setup
Initialize the database schema and seed test accounts:
```bash
cd server
npx prisma migrate dev --name init
node scripts/seed_test_accounts.js
```

### 5. Running the Application
Run both the frontend and backend in development mode:
```bash
# In the root directory
npm run dev
```
*The app will be available at http://localhost:5173*

---

## 👩‍⚕️ Professional Documentation
This project uses **ADIME** (Assessment, Diagnosis, Intervention, Monitoring, and Evaluation) standards for clinical charting and **NCP** (Nutrition Care Process) categories for rules enforcement.

---

## 📄 License
This project is for educational and clinical demonstration purposes.
