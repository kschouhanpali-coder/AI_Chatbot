<div align="center">

# 🤖 AI Assistant 🤖

### Ask Anything. Get Answers 

![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-LLM%20Chatbot-F55036?style=for-the-badge)

A clean, fast chat interface powered by open-source LLMs. Ask coding questions, get concepts explained, or draft text through a simple ChatGPT-style interface backed by Groq's fast inference.

*A clean, fast chat interface powered by open-source LLMs.*

</div>

---

## 🚀 Live Demo

<div align="center">

### **[▶️ LAUNCH AI ASSISTANT - Live Demo](https://ai-chatbot-llmbased.netlify.app)**

*Create an account and start chatting directly in your browser!*

</div>

---

## ✨ Features

- 💬 **ChatGPT-Style Interface** - Clean, distraction-free chat UI
- ⚡ **Fast Inference** - Powered by Groq (`openai/gpt-oss-20b`)
- 🎯 **Quick-Start Prompts** - One-tap prompts for writing code, explaining concepts, and drafting text
- 👤 **User Accounts** - Sign up and sign in with email and password
- 🕘 **Per-User Chat History** - Conversations persist across sessions, with **New Chat** and **Recent Chats** in the sidebar
- 📤 **Chat Export** - Download your conversation as JSON or plain text
- 🗑️ **History Control** - Delete individual messages or clear all saved history
- 🔢 **Live Character & Token Counter** - See the size of your message as you type
- ⚙️ **Settings Panel** - Add or update your Groq API key at any time
- 🛟 **Automatic Fallback Storage** - Local JSON storage if Supabase is unreachable

---

## 🏁 Quick Start

### Use Online
No installation needed! [Launch the live demo](https://ai-chatbot-llmbased.netlify.app)

### Run Locally

**Prerequisites:** Node.js, a free [Groq API key](https://console.groq.com/keys), and (optionally) a Supabase project

1. Clone the repository:
```bash
git clone https://github.com/kschouhanpali-coder/ai-assistant.git
cd ai-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000
GROQ_API_KEY=your_groq_api_key
ACTIVE_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-20b
```

4. Start the app:
```bash
npm run dev
```

5. Visit `http://localhost:3000` in your browser

---

## 🎯 How to Use

1. **Sign Up / Sign In** - create an account with your email and password
2. **Add Your Key** - open **Settings** and save your Groq API key
3. **Start Chatting** - type a message, or tap a quick-start prompt
4. **Manage Chats** - use **New Chat** and **Recent Chats** in the sidebar
5. **Export or Clear** - download your history as JSON or TXT, or clear it whenever you like

---

## 🗂️ Chat Modules

| Module | Description |
|--------|-------------|
| **💻 Coding Assistant** | Debugging, code explanation, and quick snippets |
| **📚 Concept Explainer** | Break down ideas with simplified summaries |
| **✍️ Writing Assistant** | Draft, edit, and adjust the tone of messages |

---

## 💻 Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** Supabase (with local JSON fallback)
- **AI Provider:** Groq API (`openai/gpt-oss-20b`)
- **Deployment:** Netlify

---

## 📝 License

MIT License - Free to use and modify

---

<div align="center">

**[Live Demo](https://ai-chatbot-llmbased.netlify.app) | [GitHub](https://github.com/kschouhanpali-coder/ai-assistant) | [Report Issues](https://github.com/kschouhanpali-coder/ai-assistant/issues)**

*A clean, fast chat interface powered by open-source LLMs.* 🤖

</div>
