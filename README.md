# 🚀 AI-Powered Adaptive Quiz Agent

A sophisticated, AI-driven educational platform designed to transform static content into interactive, personalized learning experiences. Built with **Next.js 16**, **QWEN3.5 72B**, and **Clerk**, this application generates adaptive quizzes from various sources and provides real-time analytics to help users master any topic.

![Project Banner](public/banner1.jpeg)

---

## ✨ Key Features

- **📂 Multi-Source Quiz Generation**: Generate high-quality quizzes instantly from:
  - 📄 PDF Documents (automatic text extraction)
  - 🎥 YouTube Videos (transcript analysis)
  - 🌐 Web URLs & Articles
  - 📝 Manual Topic Input
- **🧠 Adaptive AI Logic**: The system analyzes user performance in real-time to adjust question difficulty and focus on weak areas.
- **📊 Detailed Analytics**: Visualized progress tracking using **Recharts**, highlighting strengths, weaknesses, and improvement trends.
- **👥 Team Quiz Rooms**: Collaborative learning with real-time leaderboards powered by **Socket.io**.
- **📝 Automated Learning Paths**: Beyond just quizzes, the platform generates tailored notes and study resources based on quiz results.
- **🔐 Secure Authentication**: Seamless user management and protected routes with **Clerk Auth**.
- **🎨 Premium UI/UX**: A stunning, responsive interface built with **Tailwind CSS 4**, **Framer Motion**, and **Shadcn UI**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **AI Engine**: [Google Gemini AI](https://ai.google.dev/)
- **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose
- **Auth**: [Clerk](https://clerk.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), Framer Motion, Lucide Icons
- **Charts**: [Recharts](https://recharts.org/)
- **Real-time**: [Socket.io](https://socket.io/)

---

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Instance (Atlas or Local)
- Google AI (Gemini) API Key
- Clerk Authentication Keys

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Sreenu-y/AI-Powered-Adaptive-Quiz-Agent.git
   cd AI-Powered-Adaptive-Quiz-Agent
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and copy the values from `.env.example`:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your API keys for Clerk, MongoDB, and Gemini.

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 📁 Project Structure

```text
├── src/
│   ├── app/            # Next.js App Router (Pages & API Routes)
│   ├── components/     # UI Components (Header, Hero, etc.)
│   ├── data/           # Static content (FAQs, Features)
│   ├── lib/            # Utility functions (AI, DB, Youtube, PDF)
│   ├── models/         # Mongoose Schemas (User, Quiz, Room)
│   └── actions/        # Server Actions (Dashboard, Quiz, Room)
├── public/             # Static assets (Images, Logo)
├── .env.example        # Environment variables template
├── components.json     # Shadcn UI configuration
└── package.json        # Dependencies and scripts
```

---

## 🔐 Environment Variables

Ensure the following variables are set in your `.env.local`:

| Variable                            | Description                        |
| :---------------------------------- | :--------------------------------- |
| `DATABASE_URL`                      | Your MongoDB connection string     |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Frontend API Key             |
| `CLERK_SECRET_KEY`                  | Clerk Backend API Key              |
| `GEMINI_API_KEYS`                   | Comma-separated Gemini AI API Keys |
| `QWEN_API_KEY`                      | QWEN AI API Keys                   |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Developed with ❤️ for the **Agentica 2.0 Hackathon**.
