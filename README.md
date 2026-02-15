# Finex - Personal Finance & Expense Tracker

A modern, full-stack personal finance management application with AI-powered receipt scanning, budget planning, and expense analytics.

## Features

- **Receipt Management** - Upload and scan receipts using OCR (PaddleOCR + Gemini AI)
- **Expense Tracking** - Automatic categorization and tracking of expenses
- **Budget Planning** - Set and monitor budgets with visual progress indicators
- **Bill Reminders** - Never miss a payment with smart bill tracking
- **Analytics Dashboard** - Visual insights into spending patterns with charts
- **AI Suggestions** - Get personalized financial advice powered by Groq AI
- **Subscription Tracking** - Monitor recurring subscriptions
- **User Authentication** - Secure OTP-based email authentication via Supabase

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Query** - Server state management
- **Recharts** - Data visualization
- **React Hook Form + Zod** - Form handling & validation

### Backend
- **FastAPI** - Python API framework
- **MongoDB Atlas** - Database
- **Motor** - Async MongoDB driver
- **PaddleOCR** - Receipt text extraction
- **Google Gemini AI** - Receipt parsing & categorization
- **Supabase** - Authentication

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **MongoDB Atlas** account (free tier works)
- **Supabase** account (free tier works)
- **Gmail** account (for OTP emails)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/finex.git
cd finex
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install
```

### 4. Environment Configuration

#### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
# MongoDB - Get from https://cloud.mongodb.com
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=finex
DB_NAME=finex

# API Settings
DEBUG=False
PORT=8000
FRONTEND_URL=http://localhost:5173

# Supabase - Get from https://supabase.com/dashboard -> Settings -> API
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Email (Gmail App Password) - Get from https://myaccount.google.com/apppasswords
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_16_char_app_password
SENDER_NAME=Finex

# Gemini AI (Optional) - Get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key
```

#### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env` and fill in your values:

```env
# Supabase
VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# API
VITE_API_URL=http://localhost:8000/api

# Groq AI (Optional) - Get from https://console.groq.com/keys
VITE_GROQ_API_KEY=your_groq_api_key
```

### 5. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Authentication** → **Providers** → Enable **Email**
3. Disable "Confirm email" for OTP-based flow
4. Copy your project URL and anon key from **Settings** → **API**

### 6. MongoDB Setup

1. Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user
3. Whitelist your IP (or use `0.0.0.0/0` for development)
4. Get your connection string and add it to `.env`

## Running the Application

### Start Backend

```bash
cd backend
python run.py
```

Backend runs at: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Project Structure

```
finex/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── models/       # Pydantic models
│   │   ├── services/     # Business logic
│   │   ├── config.py     # Settings
│   │   ├── database.py   # MongoDB connection
│   │   └── main.py       # FastAPI app
│   ├── storage/          # Uploaded files
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── stores/       # Zustand stores
│   │   └── lib/          # Utilities
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/request-otp` | Request OTP for signup/login |
| `POST /api/auth/verify-otp` | Verify OTP code |
| `GET /api/receipts` | Get user's receipts |
| `POST /api/receipts/upload` | Upload & scan receipt |
| `GET /api/budget` | Get budget settings |
| `GET /api/bills` | Get bill reminders |
| `GET /api/analytics/summary` | Get spending analytics |
| `GET /api/subscriptions` | Get subscriptions |

## Screenshots

*Coming soon*

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Karthik Prabhu**

- Email: [karthikprabhu319@gmail.com](mailto:karthikprabhu319@gmail.com)
- Website: [https://kaprabhu.me](https://kaprabhu.me)

---

Made with ❤️ by Karthik Prabhu
