<div align="center" id="top">

# 🤖 AI Assistant

**A clean, fast chat interface powered by open-source LLMs.**

Ask coding questions, get concepts explained, or draft text — all through a simple, ChatGPT-style interface backed by Groq's blazing-fast inference.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Netlify-00C7B7?style=for-the-badge)](https://ai-chatbot-llmbased.netlify.app)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Primary_Engine-F55036?style=flat-square)
![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Chat Modules](#-chat-modules)
- [Getting Started](#-getting-started)
- [Usage](#-usage)
- [System Configuration](#-system-configuration)
- [Performance Metrics](#-performance-metrics)
- [Project Structure](#-project-structure)
- [Technologies Used](#️-technologies-used)
- [Security & Privacy](#-security--privacy)
- [Deployment](#️-deployment)
- [Best Use Cases](#-best-use-cases)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [FAQ](#-faq)
- [Credits & Contact](#-credits--contact)

---

## 📋 Overview

**AI Assistant** is a lightweight, self-hostable chatbot built for speed and simplicity. Rather than wrapping a heavy framework around the chat experience, it pairs a clean frontend with Groq's fast open-source model inference — so responses come back quickly, whether you're debugging code, exploring a new concept, or drafting a message.

The platform uses **Supabase for persistent storage**, with an automatic local fallback so chat history and user data keep working even without a database configured.

---

## 🌐 Live Demo

<div align="center">

### 👉 [**Launch AI Assistant**](https://ai-chatbot-llmbased.netlify.app)

*Runs live in your browser — no installation required.*

</div>

---

## ✨ Features

<table>
<tr>
<td valign="top" width="50%">

### 💬 Chat System
- **Simple, ChatGPT-style Interface** — clean, distraction-free chat UI
- **Fast Inference** — powered by Groq (`openai/gpt-oss-20b`)
- **Quick-Start Prompts** — for coding, explanations, and writing
- **Per-User Chat History** — conversations persist across sessions

</td>
<td valign="top" width="50%">

### ⚙️ Reliability & Access
- **User Authentication** — secure, per-user access
- **Automatic Fallback Storage** — local JSON if Supabase is unreachable
- **Supabase Integration** — managed persistence for chats and users
- **Netlify Deployment** — fast, globally distributed hosting

</td>
</tr>
</table>

---

## 🏗️ Architecture

### Core Components

| Component | Description |
|---|---|
| **Chat Interface** | Real-time conversation with the AI assistant |
| **Auth & Session Layer** | User authentication and per-user chat history |
| **Storage Layer** | Supabase persistence with local JSON fallback |
| **API Server** | Express backend routing requests to the Groq API |

### LLM Integration

| Layer | Technology |
|---|---|
| **Primary Engine** | Groq API |
| **Model** | `openai/gpt-oss-20b` |
| **Storage System** | Supabase (with local JSON fallback) |
| **Framework** | Node.js + Express backend, HTML/CSS/JS frontend |

---

## 🎯 Chat Modules

<table>
<tr>
<td valign="top" width="50%">

#### 💻 Coding Assistant
**Focus:** Debugging, Code Explanation, Snippets
`Code Review` · `Debugging Help` · `Language Concepts` · `Quick Snippets`

#### 📚 Concept Explainer
**Focus:** Breaking Down Ideas, Learning Support
`Concept Explanation` · `Simplified Summaries` · `Learning Aid`

</td>
<td valign="top" width="50%">

#### ✍️ Writing Assistant
**Focus:** Drafting, Editing, Tone Adjustment
`Text Drafting` · `Editing Support` · `Message Writing`

</td>
</tr>
</table>

> Quick-start prompts route you into these use cases instantly, or you can just start typing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- A free [Groq API key](https://console.groq.com/keys)
- (Optional) A Supabase project

### Installation

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

### Running the Application
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser 🚀

---

## 📖 Usage

### Chat
1. Type your message in the chat box and press send
2. Use the quick-start prompts to try coding, explanations, or writing
3. The assistant responds in real time using Groq inference

### System Configuration
1. Open the **Settings** panel
2. Add or update your Groq API key at any time
3. (Optional) Connect Supabase for persistent chat history

### Chat History
- Conversations are saved per authenticated user
- If Supabase isn't reachable, history falls back to local JSON automatically
- No manual setup required for the fallback to kick in

---

## 🔧 System Configuration

### Groq Engine
Provides fast, low-latency inference for chat responses.
- **Setup:** add your Groq API key
- **Documentation:** [console.groq.com](https://console.groq.com/keys)
- **Benefits:** blazing-fast open-source model inference
- **Model:** `openai/gpt-oss-20b`

### Supabase Storage
Handles user authentication and persistent chat history.
- **Setup:** add your Supabase URL and key
- **Benefits:** durable, per-user chat history across sessions
- **Fallback:** local JSON storage if Supabase is unreachable

---

## 📊 Performance Metrics

| Metric | Value |
|---|---|
| **AI Provider** | Groq |
| **Model** | `openai/gpt-oss-20b` |
| **Storage Fallback** | Automatic (local JSON) |
| **Deployment** | Netlify |

---

## 📁 Project Structure

```bash
ai-assistant/
├── server.js                # Express app entry point
├── routes/
│   ├── chat.js               # Chat message handling
│   └── auth.js               # User authentication routes
├── services/
│   ├── groqClient.js         # Groq API integration
│   └── storage.js            # Supabase + local JSON fallback logic
├── public/
│   ├── index.html            # Chat interface
│   ├── styles.css            # Frontend styling
│   └── app.js                # Frontend chat logic
├── .env.example               # Environment variables template
├── package.json               # Node dependencies
└── README.md
```

---

## 🛠️ Technologies Used

| Category | Technology |
|---|---|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Node.js, Express |
| **Database** | Supabase (local JSON fallback) |
| **AI Provider** | Groq API |
| **Deployment** | Netlify |

### Dependencies
```
express
dotenv
@supabase/supabase-js
node-fetch
```

Install all dependencies:
```bash
npm install
```

---

## 🔒 Security & Privacy

- API keys are stored locally in the `.env` file
- The `.env` file is excluded from version control via `.gitignore`
- Chat data is scoped per authenticated user
- Sensitive data is managed through environment variables

---

## ☁️ Deployment

### Netlify (Recommended)
1. Push your code to GitHub
2. Connect the repo to Netlify
3. Add environment variables in the Netlify dashboard: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
4. Deploy automatically

### Traditional Server
```bash
npm run dev
```

---

## 💡 Best Use Cases

1. **Coding Help** — debug snippets, get explanations, explore language features
2. **Concept Learning** — break down unfamiliar topics quickly
3. **Writing & Drafting** — draft messages, emails, or short text
4. **Lightweight Self-Hosting** — run your own fast chatbot without a heavy framework
5. **Prototyping** — quickly test ideas against an open-source LLM

---

## 🗺️ Roadmap

- [ ] Streaming responses
- [ ] Multi-model provider switching
- [ ] Conversation export
- [ ] Mobile-responsive UI improvements
- [ ] File upload support in chat
- [ ] Dark mode

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

---

## ❓ FAQ

**What happens if Supabase isn't configured?**
The app automatically falls back to local JSON storage for chat history and user data.

**Can I use a different Groq model?**
Yes — update the `GROQ_MODEL` value in your `.env` file.

**Do I need a Supabase account to run this?**
No, it's optional. The app works out of the box with local storage.

**Can I run this locally?**
Yes! Follow the installation steps above to run it on your own machine.

---

## 👤 Credits & Contact

<div align="center">

🤖

### Built by [Your Name](https://github.com/your-username)

*"A clean, fast chat interface powered by open-source LLMs."*

</div>

<br/>

> 📬 **Get in touch** — reach out on [GitHub](https://github.com/your-username), [X / Twitter](https://twitter.com/your-username), or via [email](mailto:support@ai-assistant.dev).
>
> 🐛 **Found a bug?** [Open an issue](https://github.com/your-username/ai-assistant/issues) with a detailed description and I'll take a look.
>
> 💡 **Have an idea for a feature?** [Start a discussion](https://github.com/your-username/ai-assistant/discussions) — I'd love to hear it.
>
> ⭐ **Finding AI Assistant useful?** A star on the repo helps others discover it too.

<br/>

AI Assistant is built on **Node.js + Express**, powered by **Groq** for inference, with **Supabase** for persistent storage.

<div align="center">

<br/>

<sub>⭐ If AI Assistant made your day easier, consider giving it a star.</sub>

<br/>

**Version 1.0.0** · Status: ✅ Active & Maintained

<br/>

**[⬆ Back to top](#top)**

</div>
