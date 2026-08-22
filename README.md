# AI Assistant

A simple AI chatbot web app with a clean chat interface. Ask coding questions, get concepts explained, or draft text — powered by a fast open-source LLM through Groq.

🔗 **Live Demo:** [https://ai-chatbot-llmbased.netlify.app](https://ai-chatbot-llmbased.netlify.app)

## Features

- 💬 Simple, ChatGPT-style chat interface
- ⚡ Fast responses powered by Groq (`openai/gpt-oss-20b` model)
- 🗂️ Chat history saved per user
- 🔐 User authentication support
- ☁️ Supabase integration for data storage (with local JSON fallback)
- 🚀 Deployed on Netlify

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** Supabase (with local JSON as fallback)
- **AI Provider:** Groq API
- **Deployment:** Netlify

## Getting Started

### Prerequisites

- Node.js installed
- A free [Groq API key](https://console.groq.com/keys)
- (Optional) A Supabase project

### Installation

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd ai-assistant
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables

   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   PORT=3000
   GROQ_API_KEY=your_groq_api_key
   ACTIVE_PROVIDER=groq
   GROQ_MODEL=openai/gpt-oss-20b
   ```

4. Run the app
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- Type your message in the chat box and press send
- Use the quick-start prompts to try writing code, explaining a concept, or drafting text
- Configure your Groq API key anytime from the Settings panel

## Notes

- If Supabase isn't reachable, the app automatically falls back to local JSON storage for chat history and user data.
- Keep your `.env` file out of version control (already included in `.gitignore`).

## License

This project is open for personal and educational use.
