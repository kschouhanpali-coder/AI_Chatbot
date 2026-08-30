<div align="center">

# 🤖 AI Assistant

**A clean, fast chat interface powered by open-source LLMs.**

Ask coding questions, get concepts explained, or draft text — all through a simple, ChatGPT-style interface backed by Groq's blazing-fast inference.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Try_Now-00C7B7?style=for-the-badge)](https://ai-chatbot-llmbased.netlify.app)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square)
![Netlify](https://img.shields.io/badge/Deployed_on-Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [Notes](#-notes)
- [License](#-license)

---

## 🎯 Overview

**AI Assistant** is a lightweight, self-hostable chatbot built for speed and simplicity. Rather than wrapping a heavy framework around the chat experience, it pairs a clean frontend with Groq's fast open-source model inference — so responses come back quickly, whether you're debugging code, exploring a new concept, or drafting a message. Chat history is saved per user, with Supabase handling persistence and a local JSON fallback keeping things working even without a database configured.

---

## 🌐 Live Demo

<div align="center">

### 👉 [**Try AI Assistant Now**](https://ai-chatbot-llmbased.netlify.app)

*Runs live in your browser — no installation required.*

</div>

---

## ✨ Features

<table>
<tr>
<td valign="top" width="50%">

### 💬 Chat Experience
- Simple, ChatGPT-style chat interface
- Fast responses powered by Groq (`openai/gpt-oss-20b` model)
- Quick-start prompts for coding, explanations, and writing

</td>
<td valign="top" width="50%">

### 🔐 Data & Access
- Chat history saved per user
- User authentication support
- Supabase integration for data storage, with local JSON fallback
- Deployed on Netlify

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Node.js, Express |
| **Database** | Supabase (with local JSON as fallback) |
| **AI Provider** | Groq API |
| **Deployment** | Netlify |

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- A free [Groq API key](https://console.groq.com/keys)
- (Optional) A Supabase project

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd ai-assistant
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file in the root directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000
GROQ_API_KEY=your_groq_api_key
ACTIVE_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-20b
```

**4. Run the app**
```bash
npm run dev
```

**5. Open the app**

Visit [http://localhost:3000](http://localhost:3000) in your browser 🚀

---

## 📝 Usage

| Step | Action |
|---|---|
| 1️⃣ | Type your message in the chat box and press send |
| 2️⃣ | Use the quick-start prompts to try writing code, explaining a concept, or drafting text |
| 3️⃣ | Configure your Groq API key anytime from the Settings panel |

---

## 📌 Notes

- If Supabase isn't reachable, the app automatically falls back to local JSON storage for chat history and user data
- Keep your `.env` file out of version control (already included in `.gitignore`)

---

## 📄 License

This project is open for personal and educational use.
