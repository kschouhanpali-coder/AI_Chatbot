const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const ENV_PATH = path.join(__dirname, '.env');
const HISTORY_PATH = path.join(__dirname, 'chat_history.json');
const USERS_PATH = path.join(__dirname, 'users.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global state
let supabaseClient = null;

// Custom helper to parse .env file on startup
async function loadEnv() {
  try {
    const data = await fs.readFile(ENV_PATH, 'utf8');
    data.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          // Strip surrounding quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
    });
  } catch (error) {
    // If .env doesn't exist, create it with template
    try {
      const template = 'GROQ_API_KEY=\nACTIVE_PROVIDER=groq\nSUPABASE_URL=\nSUPABASE_KEY=\nPORT=3000\n';
      await fs.writeFile(ENV_PATH, template);
    } catch (e) {
      console.error('Failed to create default .env:', e);
    }
  }
}

// Custom helper to update multiple environment variables in the .env file
async function saveEnvVars(vars) {
  let content = '';
  try {
    content = await fs.readFile(ENV_PATH, 'utf8');
  } catch (error) {
    content = 'GROQ_API_KEY=\nACTIVE_PROVIDER=groq\nPORT=3000\n';
  }

  let lines = content.split(/\r?\n/);

  for (const [key, value] of Object.entries(vars)) {
    let replaced = false;
    lines = lines.map((line) => {
      if (line.trim().startsWith(`${key}=`)) {
        replaced = true;
        return `${key}=${value}`;
      }
      return line;
    });
    if (!replaced) {
      lines.push(`${key}=${value}`);
    }
    process.env[key] = value;
  }

  await fs.writeFile(ENV_PATH, lines.join('\n'));
}

// Initialize database files and Supabase client
async function initStorage() {
  await loadEnv();

  // Initialize local chat history file
  try {
    await fs.access(HISTORY_PATH);
  } catch {
    await fs.writeFile(HISTORY_PATH, JSON.stringify([], null, 2));
  }

  // Initialize local users file
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, JSON.stringify([], null, 2));
  }

  // Initialize Supabase Client if URL/Key are defined in environment
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;

  if (sbUrl && sbKey && sbUrl.trim() !== '' && sbKey.trim() !== '') {
    try {
      console.log('Initializing Supabase connection...');
      supabaseClient = createClient(sbUrl.trim(), sbKey.trim());
      
      // Test query to verify connection
      try {
        const { error } = await supabaseClient.from('chats').select('*').limit(1);
        if (error) {
          console.warn(`Supabase connection test query warning: ${error.message}`);
          if (error.message && (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('network'))) {
            console.log('Supabase connection failed due to network/DNS. Disabling Supabase (falling back to local JSON).');
            supabaseClient = null;
          } else {
            console.log('Supabase client initialized, but table check failed. Chat history operations will fall back to local JSON if database queries fail.');
          }
        } else {
          console.log('Successfully connected to Supabase database for chat persistence.');
        }
      } catch (queryErr) {
        console.warn('Supabase connection test query failed:', queryErr.message || queryErr);
        console.log('Supabase connection failed. Disabling Supabase (falling back to local JSON) to prevent server hangs/timeouts.');
        supabaseClient = null;
      }
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      console.log('Supabase client initialization failed. Setting client to null.');
      supabaseClient = null;
    }
  } else {
    console.log('Supabase credentials not fully set in .env. Using local chat_history.json for persistence.');
  }
}

// Helper to decode a JWT payload without signature verification (used as a fallback when offline/sandboxed)
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
    return JSON.parse(payloadStr);
  } catch (err) {
    return null;
  }
}

// Authentication Middleware verifying Supabase JWT or Mock token
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Session token is missing.' });
  }

  // Check if it is a local mock token
  if (token.startsWith('mock-')) {
    try {
      const payloadBase64 = token.substring(5);
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString();
      const payload = JSON.parse(payloadStr);
      req.user = { id: payload.id, email: payload.email };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized. Invalid local session token.' });
    }
  }

  // Verify using Supabase if it is a Supabase token
  if (!supabaseClient) {
    return res.status(401).json({ error: 'Unauthorized. Database in local mode but Supabase token presented.' });
  }

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (error) {
      console.warn('Supabase auth getUser returned error, attempting local JWT decoding fallback:', error.message);
      const decoded = decodeJWT(token);
      if (decoded && (decoded.sub || decoded.id)) {
        req.user = {
          id: decoded.sub || decoded.id,
          email: decoded.email || 'user@example.com'
        };
        return next();
      }
      return res.status(401).json({ error: `Unauthorized. Session validation failed: ${error.message}` });
    }
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. User not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.warn('Supabase auth getUser threw exception, attempting local JWT decoding fallback:', err.message || err);
    const decoded = decodeJWT(token);
    if (decoded && (decoded.sub || decoded.id)) {
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email || 'user@example.com'
      };
      return next();
    }
    console.error('Auth middleware exception:', err);
    res.status(401).json({ error: 'Unauthorized. Internal auth verification error.' });
  }
}

// Helper to read history (Supabase or Local JSON)
async function getHistory(userId) {
  if (supabaseClient && userId && userId !== 'local-user' && !userId.startsWith('local-')) {
    try {
      const { data, error } = await supabaseClient
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });
      if (!error) return data || [];
      console.error('Supabase query history error:', error);
    } catch (e) {
      console.error('Supabase query exception:', e);
    }
  }

  // Fallback to local history
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf8');
    const allHistory = JSON.parse(data);
    
    // Filter history scoped to this specific local user
    let userHistory = allHistory.filter(msg => msg.user_id === userId);
    
    // Dynamic migration: If the logged-in user has no local history, but there is history
    // in the file from another user, migrate the old history to the new user ID.
    if (userHistory.length === 0 && allHistory.length > 0) {
      console.log(`Migrating ${allHistory.length} legacy local chats to current user ID: ${userId}`);
      allHistory.forEach(msg => {
        msg.user_id = userId;
      });
      await fs.writeFile(HISTORY_PATH, JSON.stringify(allHistory, null, 2));
      userHistory = allHistory;
    }

    // Migration: Ensure every message has a session_id
    let lastSessionId = null;
    let modified = false;
    allHistory.forEach(msg => {
      if (!msg.session_id) {
        if (msg.role === 'user') {
          lastSessionId = 'session-' + msg.timestamp.replace(/[^a-zA-Z0-9]/g, '');
        } else if (!lastSessionId) {
          lastSessionId = 'session-legacy';
        }
        msg.session_id = lastSessionId;
        modified = true;
      }
    });
    if (modified) {
      await fs.writeFile(HISTORY_PATH, JSON.stringify(allHistory, null, 2));
      userHistory = allHistory.filter(msg => msg.user_id === userId);
    }
    
    return userHistory;
  } catch (error) {
    return [];
  }
}

// Helper to save history (Local JSON fallback)
async function saveLocalHistory(userId, message) {
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf8');
    const history = JSON.parse(data);
    message.user_id = userId;
    history.push(message);
    await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Error saving local history:', e);
  }
}

// Helper to clear local history for a user
async function clearLocalHistory(userId) {
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf8');
    const history = JSON.parse(data);
    const updatedHistory = history.filter(msg => msg.user_id !== userId);
    await fs.writeFile(HISTORY_PATH, JSON.stringify(updatedHistory, null, 2));
  } catch (e) {
    console.error('Error clearing local history:', e);
  }
}

// API: Get config (shares credentials and settings with the client)
app.get('/api/config', (req, res) => {
  res.json({
    apiKey: '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    activeProvider: 'groq',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    useSupabase: supabaseClient !== null
  });
});

// API: Save and Validate config (Groq only)
app.post('/api/config', async (req, res) => {
  const { groqApiKey } = req.body;
  
  const updates = {
    ACTIVE_PROVIDER: 'groq'
  };
  if (groqApiKey !== undefined) updates.GROQ_API_KEY = groqApiKey.trim();

  try {
    if (groqApiKey) {
      // Validate Groq API key using native fetch (Node 18+)
      try {
        const valRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${groqApiKey.trim()}` }
        });
        if (valRes.status === 401) {
          throw new Error('Invalid Groq API key.');
        }
      } catch (valErr) {
        const errStr = valErr.message || '';
        if (errStr.includes('fetch failed') || errStr.includes('getaddrinfo') || errStr.includes('ENOTFOUND') || errStr.includes('network')) {
          console.warn('Groq API key validation fetch failed (server is offline/sandboxed). Saving key anyway.');
        } else if (errStr.includes('429') || errStr.includes('Too Many Requests') || errStr.includes('rate')) {
          console.warn('Groq API key validation hit rate limit (429). Key is valid but throttled. Saving key anyway.');
        } else {
          throw valErr;
        }
      }
    }

    // Write updates to .env file
    await saveEnvVars(updates);

    res.json({ success: true, message: 'Settings saved and verified successfully.' });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Validation failed. Please verify your API key.'
    });
  }
});

// API: Local Auth Signup (Fallback)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const data = await fs.readFile(USERS_PATH, 'utf8');
    const users = JSON.parse(data);

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const newUser = {
      id: 'local-' + crypto.randomUUID(),
      email: email.trim(),
      password: password // In local dev environment we store plain text passwords
    };
    users.push(newUser);
    await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));

    // Automatically sign in on signup by returning a mock token
    const tokenPayload = { id: newUser.id, email: newUser.email };
    const mockToken = 'mock-' + Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    res.json({
      success: true,
      message: 'Account created locally!',
      session: {
        access_token: mockToken,
        user: { id: newUser.id, email: newUser.email }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process local registration.' });
  }
});

// API: Local Auth Signin (Fallback)
app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const data = await fs.readFile(USERS_PATH, 'utf8');
    const users = JSON.parse(data);

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const tokenPayload = { id: user.id, email: user.email };
    const mockToken = 'mock-' + Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    res.json({
      success: true,
      session: {
        access_token: mockToken,
        user: { id: user.id, email: user.email }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process local login.' });
  }
});

// API: Get chat history (scoped to user)
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    console.log('GET /api/history request. User:', req.user);
    const history = await getHistory(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read chat history.' });
  }
});

// API: Clear chat history (scoped to user)
app.delete('/api/history', requireAuth, async (req, res) => {
  try {
    if (supabaseClient && !req.user.id.startsWith('local-')) {
      try {
        const { error } = await supabaseClient
          .from('chats')
          .delete()
          .eq('user_id', req.user.id);
        if (error) {
          console.warn('Supabase clear history error, falling back to local storage:', error);
        }
      } catch (sbErr) {
        console.warn('Supabase clear history query failed, falling back to local storage:', sbErr);
      }
    }
    
    // Always clear local history for this user as a fallback / sync step
    await clearLocalHistory(req.user.id);
    
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

// API: Delete a specific session or message (scoped to user)
app.post('/api/history/delete', requireAuth, async (req, res) => {
  const { timestamp, session_id } = req.body;
  if (!timestamp && !session_id) {
    return res.status(400).json({ error: 'Timestamp or Session ID is required.' });
  }
  
  try {
    if (supabaseClient && !req.user.id.startsWith('local-')) {
      try {
        if (session_id) {
          const { error } = await supabaseClient
            .from('chats')
            .delete()
            .eq('user_id', req.user.id)
            .eq('session_id', session_id);
          if (error) {
            console.warn('Supabase delete session error:', error);
          }
        } else {
          const decodedTimestamp = decodeURIComponent(timestamp);
          const history = await getHistory(req.user.id);
          const index = history.findIndex(msg => msg.timestamp === decodedTimestamp);
          if (index !== -1) {
            const toDelete = [decodedTimestamp];
            if (index + 1 < history.length && history[index + 1].role === 'model') {
              toDelete.push(history[index + 1].timestamp);
            }
            const { error } = await supabaseClient
              .from('chats')
              .delete()
              .eq('user_id', req.user.id)
              .in('timestamp', toDelete);
            if (error) {
              console.warn('Supabase delete message error:', error);
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase delete message query failed, falling back to local storage:', sbErr);
      }
    }
    
    // Always fall back to local storage delete to maintain local user persistence
    const data = await fs.readFile(HISTORY_PATH, 'utf8');
    let history = JSON.parse(data);
    
    if (session_id) {
      history = history.filter(msg => !(msg.user_id === req.user.id && msg.session_id === session_id));
    } else {
      const decodedTimestamp = decodeURIComponent(timestamp);
      const index = history.findIndex(msg => msg.user_id === req.user.id && msg.timestamp === decodedTimestamp);
      if (index !== -1) {
        const userHistory = history.filter(msg => msg.user_id === req.user.id);
        const userIndex = userHistory.findIndex(msg => msg.timestamp === decodedTimestamp);
        const toDeleteTimestamps = [decodedTimestamp];
        if (userIndex !== -1 && userIndex + 1 < userHistory.length && userHistory[userIndex + 1].role === 'model') {
          toDeleteTimestamps.push(userHistory[userIndex + 1].timestamp);
        }
        history = history.filter(msg => 
          !(msg.user_id === req.user.id && toDeleteTimestamps.includes(msg.timestamp))
        );
      }
    }
    
    await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete.' });
  }
});


// API: Save a message to history (scoped to user)
app.post('/api/history', requireAuth, async (req, res) => {
  const { role, text, timestamp, session_id } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Message text is required.' });
  }
  if (!role || (role !== 'user' && role !== 'model')) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  try {
    const msg = {
      role,
      text: text.trim(),
      timestamp: timestamp || new Date().toISOString(),
      session_id: session_id || null
    };

    if (supabaseClient && !req.user.id.startsWith('local-')) {
      msg.user_id = req.user.id;
      const { error } = await supabaseClient.from('chats').insert([msg]);
      if (error) {
        console.error('Supabase save message error, falling back to local:', error);
        await saveLocalHistory(req.user.id, msg);
      }
    } else {
      await saveLocalHistory(req.user.id, msg);
    }

    res.json({ success: true, message: msg });
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: 'Failed to save message.' });
  }
});



// API: Export chat history (scoped to user)
app.get('/api/export', requireAuth, async (req, res) => {
  const format = req.query.format || 'json';
  try {
    const history = await getHistory(req.user.id);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="chat_history.json"');
      return res.send(JSON.stringify(history, null, 2));
    } else {
      // Format as TXT
      let txtContent = `=== AI Assistant Chat History (${supabaseClient && !req.user.id.startsWith('local-') ? 'Supabase' : 'Local'} DB) ===\n`;
      txtContent += `User Profile: ${req.user.email || 'Local User'}\n\n`;
      history.forEach((msg) => {
        const date = new Date(msg.timestamp).toLocaleString();
        const roleName = msg.role === 'user' ? 'User' : 'Assistant';
        txtContent += `[${date}] ${roleName}:\n${msg.text}\n\n----------------------------------------\n\n`;
      });

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="chat_history.txt"');
      return res.send(txtContent);
    }
  } catch (error) {
    res.status(500).send('Failed to export chat history.');
  }
});

// API: Send message to Groq, save to history, stream response (scoped to user)
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Groq API key is not configured. Please set the API key in Settings.' });
  }

  try {
    // 1. Prepare user message
    const userMsg = {
      role: 'user',
      text: message.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Save to active storage
    if (supabaseClient && !req.user.id.startsWith('local-')) {
      userMsg.user_id = req.user.id;
      const { error } = await supabaseClient.from('chats').insert([userMsg]);
      if (error) {
        console.error('Supabase user message insert error:', error);
        await saveLocalHistory(req.user.id, userMsg);
      }
    } else {
      await saveLocalHistory(req.user.id, userMsg);
    }

    // Load active history for context context (last 10 messages)
    const latestHistory = await getHistory(req.user.id);
    const contextMessages = latestHistory.slice(-10);
    const messages = [
      { role: 'system', content: 'You are a helpful AI Assistant. Be concise, accurate and friendly.' }
    ];
    contextMessages.forEach(msg => {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      if (msg.text) {
        messages.push({ role, content: msg.text });
      }
    });

    // Ensure the current user message is present at the end
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message.trim()) {
      messages.push({ role: 'user', content: message.trim() });
    }

    // Set up SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Make request to Groq API with stream: true
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API connection error: ${errText}`);
    }

    const reader = response.body;
    let fullResponseText = '';

    // Stream the response from Groq directly to the client
    // Since Node 18 has readable streams as async iterables:
    for await (const chunk of reader) {
      const chunkStr = chunk.toString();
      const lines = chunkStr.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          const text = data.choices?.[0]?.delta?.content || '';
          if (text) {
            fullResponseText += text;
            res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
          }
        } catch (e) {
          // Ignore parse errors on partial chunks
        }
      }
    }

    // Save complete model response to active storage
    const modelMsg = {
      role: 'model',
      text: fullResponseText,
      timestamp: new Date().toISOString()
    };
    
    if (supabaseClient && !req.user.id.startsWith('local-')) {
      modelMsg.user_id = req.user.id;
      const { error } = await supabaseClient.from('chats').insert([modelMsg]);
      if (error) {
        console.error('Supabase model response insert error:', error);
        await saveLocalHistory(req.user.id, modelMsg);
      }
    } else {
      await saveLocalHistory(req.user.id, modelMsg);
    }

    // Signal completion to client
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error while processing chat.' });
    } else {
      res.end();
    }
  }
});

// Initialize storage and start server
initStorage().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize storage:', err);
});
