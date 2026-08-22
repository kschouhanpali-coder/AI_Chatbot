document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnExport = document.getElementById('btn-export');
  const btnClear = document.getElementById('btn-clear');
  const btnSettings = document.getElementById('btn-settings');
  const btnLogout = document.getElementById('btn-logout');
  
  const emptyState = document.getElementById('empty-state');
  const messageList = document.getElementById('message-list');
  const chatViewport = document.querySelector('.chat-viewport');
  const typingIndicator = document.getElementById('typing-indicator');
  
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const charCount = document.getElementById('char-count');
  const tokenCount = document.getElementById('token-count');
  
  // Containers
  const chatAppContainer = document.getElementById('chat-app-container');
  const authViewport = document.getElementById('auth-viewport');
  const userBanner = document.getElementById('user-banner');
  const userEmailDisplay = document.getElementById('user-email-display');
  const headerActions = document.getElementById('header-actions');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const chatSidebar = document.querySelector('.chat-sidebar');
  const sidebarHistoryList = document.getElementById('sidebar-history-list');
  const sidebarUserEmail = document.getElementById('sidebar-user-email');
  
  // Auth Form Elements
  const signinForm = document.getElementById('signin-form');
  const signinEmail = document.getElementById('signin-email');
  const signinPassword = document.getElementById('signin-password');
  const signinStatus = document.getElementById('signin-status');
  
  const signupForm = document.getElementById('signup-form');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');
  const signupStatus = document.getElementById('signup-status');
  
  const authSubtitle = document.getElementById('auth-subtitle');
  const switchToSignup = document.getElementById('switch-to-signup');
  const switchToSignin = document.getElementById('switch-to-signin');

  // Modals
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsForm = document.getElementById('settings-form');
  const providerSelect = document.getElementById('provider-select');

  
  const groqKeyGroup = document.getElementById('groq-key-group');
  const groqKeyInput = document.getElementById('groq-key-input');
  const btnToggleGroqVisibility = document.getElementById('btn-toggle-groq-visibility');
  const svgGroqEye = document.getElementById('svg-groq-eye');
  const svgGroqEyeOff = document.getElementById('svg-groq-eye-off');
  const validationStatus = document.getElementById('validation-status');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const saveBtnText = document.getElementById('save-btn-text');
  const saveBtnSpinner = document.getElementById('save-btn-spinner');
  
  const clearConfirmModal = document.getElementById('clear-confirm-modal');
  const btnCancelClear = document.getElementById('btn-cancel-clear');
  const btnConfirmClear = document.getElementById('btn-confirm-clear');
  
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  
  const exportModal = document.getElementById('export-modal');
  const btnCloseExport = document.getElementById('btn-close-export');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportTxt = document.getElementById('btn-export-txt');

  // Application State
  let isStreaming = false;
  let hasApiKey = false;
  let supabaseClient = null;
  let sessionToken = null;
  let chatTimestampToDelete = null;
  let cachedHistory = [];
  let currentSessionId = null;
  let activeProvider = 'groq';

  let groqApiKey = '';
  let isClientOnlyMode = false;

  // Initialize marked options
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  // Init App
  init();

  async function init() {
    // 0. Clear any previously cached keys from localStorage on startup
    localStorage.removeItem('groq_api_key');

    // 1. Fetch Config parameters
    await fetchConfig();
    
    // 2. Setup general Event Listeners
    setupEventListeners();
  }

  function updateSettingsButtonVisibility() {
    if (!btnSettings) return;
    if (sessionToken) {
      btnSettings.classList.remove('hidden');
    } else {
      btnSettings.classList.add('hidden');
    }
  }

  function getUserIdFromToken() {
    if (!sessionToken) return 'anonymous';
    if (sessionToken.startsWith('mock-')) {
      try {
        const payloadBase64 = sessionToken.substring(5);
        const payloadStr = atob(payloadBase64);
        const payload = JSON.parse(payloadStr);
        return payload.id || 'local-user';
      } catch (e) {
        return 'local-user';
      }
    }
    return 'local-user';
  }

  function toggleProviderInputs() {

    if (groqKeyGroup) groqKeyGroup.classList.remove('hidden');
    hasApiKey = !!groqApiKey;
  }

  // Fetch API keys and initialize Supabase Auth if credentials are fully configured and verified
  async function fetchConfig() {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      
      activeProvider = 'groq';
      if (providerSelect) {
        providerSelect.value = 'groq';
      }
      

      
      if (data.groqApiKey) {
        groqApiKey = data.groqApiKey;
        groqKeyInput.value = groqApiKey;
        groqKeyInput.placeholder = 'Key is configured';
      } else {
        groqApiKey = '';
        groqKeyInput.value = '';
        groqKeyInput.placeholder = 'Enter your gsk_ API key...';
      }
      
      toggleProviderInputs();
      updateSettingsButtonVisibility();

      // Check if Supabase URL and Key are present AND server successfully established a database client
      if (data.useSupabase && data.supabaseUrl && data.supabaseKey) {
        console.log('Initializing client-side Supabase Auth client...');
        supabaseClient = supabase.createClient(data.supabaseUrl, data.supabaseKey);

        // Listen for authentication changes (login, logout, token refreshes)
        supabaseClient.auth.onAuthStateChange((event, session) => {
          if (session) {
            handleLogin(session);
          } else {
            handleLogout();
          }
        });

        // Check active session on load
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          handleLogin(session);
        } else {
          handleLogout();
        }
      } else {
        // Local mode authentication fallback
        console.log('Supabase not connected. Operating in local auth fallback mode.');
        supabaseClient = null;
        
        // Restore local token if saved in localStorage
        const savedToken = localStorage.getItem('local_session_token');
        const savedEmail = localStorage.getItem('local_session_email');
        
        if (savedToken && savedEmail) {
          handleLogin({
            access_token: savedToken,
            user: { email: savedEmail }
          });
        } else {
          handleLogout();
        }
      }

    } catch (error) {
      console.error('Error fetching config, switching to Client-Only mode:', error);
      isClientOnlyMode = true;
      
      // Clear any old Gemini localStorage keys
      localStorage.removeItem('gemini_api_key');
      
      // Get Groq API key from localStorage if set
      groqApiKey = localStorage.getItem('groq_api_key') || '';
      activeProvider = 'groq';
      
      if (providerSelect) {
        providerSelect.value = 'groq';
      }
      
      if (groqApiKey) {
        groqKeyInput.value = groqApiKey;
        groqKeyInput.placeholder = 'Key is configured';
      } else {
        groqKeyInput.value = '';
        groqKeyInput.placeholder = 'Enter your gsk_ API key...';
      }
      
      hasApiKey = !!groqApiKey;
      toggleProviderInputs();
      updateSettingsButtonVisibility();
      handleLogout();
    }
  }

  // Handle successful login
  async function handleLogin(session) {
    sessionToken = session.access_token;
    userEmailDisplay.textContent = session.user.email;
    
    // Set dynamic greeting name
    const welcomeUsername = document.getElementById('welcome-username');
    if (welcomeUsername && session.user && session.user.email) {
      const namePart = session.user.email.split('@')[0];
      welcomeUsername.textContent = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    
    // Save locally if it is a local mock token
    if (sessionToken.startsWith('mock-')) {
      localStorage.setItem('local_session_token', sessionToken);
      localStorage.setItem('local_session_email', session.user.email);
    }
    
    // Toggle viewports
    authViewport.classList.add('hidden');
    chatAppContainer.classList.remove('hidden');
    headerActions.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    userBanner.classList.remove('hidden');
    updateSettingsButtonVisibility();

    // Update export links to include the auth token for download navigation
    btnExportJson.href = `/api/export?format=json&token=${sessionToken}`;
    btnExportTxt.href = `/api/export?format=txt&token=${sessionToken}`;

    // Reload history scoped to authenticated user
    await loadHistory();
  }

  // Handle logout
  function handleLogout() {
    sessionToken = null;
    cachedHistory = [];
    userEmailDisplay.textContent = '';
    if (sidebarUserEmail) {
      sidebarUserEmail.textContent = '';
    }
    // Reset dynamic greeting name
    const welcomeUsername = document.getElementById('welcome-username');
    if (welcomeUsername) {
      welcomeUsername.textContent = 'there';
    }
    if (sidebarHistoryList) {
      sidebarHistoryList.innerHTML = '<li class="sidebar-history-empty">No recent chats</li>';
    }
    
    // Clear local storage session tokens
    localStorage.removeItem('local_session_token');
    localStorage.removeItem('local_session_email');
    
    // Toggle viewports
    authViewport.classList.remove('hidden');
    chatAppContainer.classList.add('hidden');
    headerActions.classList.add('hidden');
    btnLogout.classList.add('hidden');
    userBanner.classList.add('hidden');
    updateSettingsButtonVisibility();
    
    // Reset export links
    btnExportJson.href = '#';
    btnExportTxt.href = '#';
  }

  // Load chat history (sends JWT in Authorization header)
  async function loadHistory() {
    if (isClientOnlyMode) {
      try {
        const userId = getUserIdFromToken();
        const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
        cachedHistory = allHistory.filter(msg => msg.user_id === userId);
        renderSidebarHistory(cachedHistory);
        
        if (cachedHistory.length > 0) {
          const latestMsg = cachedHistory[cachedHistory.length - 1];
          if (latestMsg && latestMsg.session_id) {
            handleSidebarItemClick(latestMsg.session_id);
          } else {
            startNewSession();
          }
        } else {
          startNewSession();
        }
      } catch (err) {
        console.error('Error loading history in client-only mode:', err);
      }
      return;
    }

    try {
      const headers = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/history', { headers });
      if (!response.ok) {
        const errData = await response.json();
        console.error('Server returned error loading history:', errData.error || response.statusText);
        if (sidebarHistoryList) {
          sidebarHistoryList.innerHTML = `<li class="sidebar-history-empty" style="color: var(--danger-color);">${errData.error || 'Failed to load history.'}</li>`;
        }
        return;
      }

      const history = await response.json();
      cachedHistory = history || [];
      
      // Populate the sidebar history list
      renderSidebarHistory(cachedHistory);

      if (cachedHistory.length > 0) {
        const latestMsg = cachedHistory[cachedHistory.length - 1];
        if (latestMsg && latestMsg.session_id) {
          handleSidebarItemClick(latestMsg.session_id);
        } else {
          startNewSession();
        }
      } else {
        startNewSession();
      }
    } catch (error) {
      console.error('Error loading history:', error);
      if (sidebarHistoryList) {
        sidebarHistoryList.innerHTML = `<li class="sidebar-history-empty" style="color: var(--danger-color);">Network error loading history.</li>`;
      }
    }
  }

  // Start a new chat session
  function startNewSession() {
    currentSessionId = 'session-' + new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '') + '-' + Math.random().toString(36).substr(2, 9);
    messageList.innerHTML = '';
    messageList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    document.querySelectorAll('.sidebar-history-item').forEach(item => item.classList.remove('active'));
    chatInput.value = '';
    chatInput.focus();
    adjustTextareaHeight();
    updateInputStats('');
  }

  // Handle clicking a sidebar history item
  function handleSidebarItemClick(sessionId) {
    currentSessionId = sessionId;
    
    // Toggle active list highlights
    document.querySelectorAll('.sidebar-history-item').forEach(item => {
      if (item.getAttribute('data-target-id') === sessionId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Always rebuild the message list for this session to ensure we only show this session
    emptyState.classList.add('hidden');
    messageList.classList.remove('hidden');
    messageList.innerHTML = '';
    
    cachedHistory.forEach(hMsg => {
      if (hMsg.session_id === sessionId) {
        appendMessageUI(hMsg.role, hMsg.text, hMsg.timestamp);
      }
    });
    
    scrollToBottom();
    
    // Close sidebar drawer on mobile after clicking
    if (chatSidebar && chatSidebar.classList.contains('active')) {
      chatSidebar.classList.remove('active');
      chatAppContainer.classList.remove('sidebar-open');
    }
  }

  // Render recent prompts in the sidebar history list (grouped by unique session_id)
  function renderSidebarHistory(history) {
    if (!sidebarHistoryList) return;
    sidebarHistoryList.innerHTML = '';
    
    // Group messages by session_id
    const sessionsMap = new Map();
    history.forEach(msg => {
      const sid = msg.session_id || 'session-legacy';
      if (!sessionsMap.has(sid)) {
        sessionsMap.set(sid, []);
      }
      sessionsMap.get(sid).push(msg);
    });
    
    // Convert map to list of sessions with first user prompt details
    const sessionsList = [];
    sessionsMap.forEach((msgs, sid) => {
      const firstUserMsg = msgs.find(m => m.role === 'user');
      if (firstUserMsg) {
        sessionsList.push({
          session_id: sid,
          title: firstUserMsg.text,
          timestamp: firstUserMsg.timestamp
        });
      }
    });
    
    // Sort sessions by timestamp descending (newest first)
    sessionsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sessionsList.length === 0) {
      sidebarHistoryList.innerHTML = '<li class="sidebar-history-empty">No recent chats</li>';
      return;
    }
    
    sessionsList.forEach(session => {
      const li = document.createElement('li');
      li.className = 'sidebar-history-item';
      li.setAttribute('data-target-id', session.session_id);
      if (session.session_id === currentSessionId) {
        li.classList.add('active');
      }
      
      // Strip out markdown tags and truncate prompt text preview
      let cleanText = session.title
        .replace(/[#*`_\[\]]/g, '')
        .substring(0, 24);
      if (session.title.length > 24) cleanText += '...';
      
      li.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${cleanText}</span>
        <button class="btn-delete-chat" title="Delete chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
      
      const deleteBtn = li.querySelector('.btn-delete-chat');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatTimestampToDelete = session.session_id; // Store session_id to delete
        openModal(deleteConfirmModal);
      });
      
      li.addEventListener('click', () => {
        handleSidebarItemClick(session.session_id);
      });
      
      sidebarHistoryList.appendChild(li);
    });
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Auth Toggles
    switchToSignup.addEventListener('click', (e) => {
      e.preventDefault();
      signinForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      authSubtitle.textContent = 'Create a new account to continue';
      clearAuthStatuses();
    });

    switchToSignin.addEventListener('click', (e) => {
      e.preventDefault();
      signupForm.classList.add('hidden');
      signinForm.classList.remove('hidden');
      authSubtitle.textContent = 'Sign in to your account to start chatting';
      clearAuthStatuses();
    });

    // Auth Forms submission
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = signinEmail.value.trim();
      const password = signinPassword.value.trim();
      if (!email || !password) return;

      showAuthStatus(signinStatus, 'Connecting...', 'pending');

      if (supabaseClient) {
        // Connect via Supabase Auth API
        try {
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) {
            let errorMsg = error.message;
            if (errorMsg === 'Invalid login credentials') {
              errorMsg += '. Make sure you have created an account via the "Sign Up" tab first. If you did register, check your email for a verification link, or disable email confirmation in your Supabase Auth settings.';
            }
            showAuthStatus(signinStatus, errorMsg, 'error');
          } else {
            showAuthStatus(signinStatus, 'Signed in successfully!', 'success');
            clearAuthInputs();
          }
        } catch (err) {
          showAuthStatus(signinStatus, 'Network exception occurred during sign in.', 'error');
        }
      } else {
        // Connect via Local mock Auth API
        if (isClientOnlyMode) {
          try {
            const users = JSON.parse(localStorage.getItem('local_users') || '[]');
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            if (user) {
              showAuthStatus(signinStatus, 'Signed in successfully!', 'success');
              const mockToken = 'mock-' + btoa(JSON.stringify({ id: user.id, email: user.email }));
              setTimeout(() => {
                handleLogin({
                  access_token: mockToken,
                  user: { id: user.id, email: user.email }
                });
                clearAuthInputs();
              }, 500);
            } else {
              showAuthStatus(signinStatus, 'Invalid email or password.', 'error');
            }
          } catch (err) {
            showAuthStatus(signinStatus, 'Failed to sign in locally.', 'error');
          }
          return;
        }

        try {
          const response = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await response.json();
          if (response.ok && data.session) {
            showAuthStatus(signinStatus, 'Signed in successfully!', 'success');
            handleLogin(data.session);
            clearAuthInputs();
          } else {
            showAuthStatus(signinStatus, data.error || 'Invalid credentials.', 'error');
          }
        } catch (err) {
          showAuthStatus(signinStatus, 'Failed to connect to local authentication server.', 'error');
        }
      }
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = signupEmail.value.trim();
      const password = signupPassword.value.trim();
      if (!email || !password) return;

      showAuthStatus(signupStatus, 'Creating account...', 'pending');

      if (supabaseClient) {
        // Register via Supabase Auth API
        try {
          const { data, error } = await supabaseClient.auth.signUp({ email, password });
          if (error) {
            showAuthStatus(signupStatus, error.message, 'error');
          } else {
            if (data?.session) {
              showAuthStatus(signupStatus, 'Account created and signed in!', 'success');
              clearAuthInputs();
            } else {
              showAuthStatus(signupStatus, 'Registration successful! Check your email to confirm verification, or disable email confirmation in your Supabase dashboard to login instantly.', 'success');
            }
          }
        } catch (err) {
          showAuthStatus(signupStatus, 'Network exception occurred during registration.', 'error');
        }
      } else {
        // Register via Local mock Auth API
        if (isClientOnlyMode) {
          try {
            const users = JSON.parse(localStorage.getItem('local_users') || '[]');
            const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
              showAuthStatus(signupStatus, 'User with this email already exists.', 'error');
              return;
            }
            const newUser = {
              id: 'local-' + Math.random().toString(36).substr(2, 9),
              email: email.trim(),
              password: password
            };
            users.push(newUser);
            localStorage.setItem('local_users', JSON.stringify(users));

            showAuthStatus(signupStatus, 'Account created successfully!', 'success');
            const mockToken = 'mock-' + btoa(JSON.stringify({ id: newUser.id, email: newUser.email }));
            setTimeout(() => {
              handleLogin({
                access_token: mockToken,
                user: { id: newUser.id, email: newUser.email }
              });
              clearAuthInputs();
            }, 500);
          } catch (err) {
            showAuthStatus(signupStatus, 'Failed to register local account.', 'error');
          }
          return;
        }

        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await response.json();
          if (response.ok && data.session) {
            showAuthStatus(signupStatus, 'Account created successfully!', 'success');
            handleLogin(data.session);
            clearAuthInputs();
          } else {
            showAuthStatus(signupStatus, data.error || 'Failed to create account.', 'error');
          }
        } catch (err) {
          showAuthStatus(signupStatus, 'Failed to connect to local registration server.', 'error');
        }
      }
    });

    // Log Out Button
    btnLogout.addEventListener('click', async () => {
      if (supabaseClient) {
        try {
          await supabaseClient.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        }
      } else {
        handleLogout();
      }
    });

    // New Chat Button Click
    const btnNewChat = document.getElementById('btn-new-chat');
    if (btnNewChat) {
      btnNewChat.addEventListener('click', () => {
        startNewSession();
        // Close mobile drawer if open
        if (chatSidebar && chatSidebar.classList.contains('active')) {
          chatSidebar.classList.remove('active');
          chatAppContainer.classList.remove('sidebar-open');
        }
      });
    }

    // Mobile Sidebar Toggle
    if (btnToggleSidebar && chatSidebar) {
      btnToggleSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        chatSidebar.classList.toggle('active');
        chatAppContainer.classList.toggle('sidebar-open');
      });
      
      // Close sidebar when clicking main chat viewport on mobile
      document.querySelector('.chat-main').addEventListener('click', () => {
        if (chatSidebar.classList.contains('active')) {
          chatSidebar.classList.remove('active');
          chatAppContainer.classList.remove('sidebar-open');
        }
      });
    }

    // Prompt Cards Click
    document.querySelectorAll('.prompt-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        chatInput.value = prompt;
        chatInput.focus();
        adjustTextareaHeight();
        updateInputStats(prompt);
      });
    });

    // Chat Input events
    chatInput.addEventListener('input', () => {
      adjustTextareaHeight();
      updateInputStats(chatInput.value);
    });

    chatInput.addEventListener('keydown', (e) => {
      // Enter key submits form, Shift+Enter inserts newline
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const hasAccess = !!sessionToken;
        if (chatInput.value.trim() !== '' && !isStreaming && hasAccess) {
          chatForm.dispatchEvent(new Event('submit'));
        }
      }
    });

    // Chat Form Submit (Send Message)
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      const hasAccess = !!sessionToken;
      if (!message || isStreaming || !hasAccess) return;

      if (!hasApiKey) {
        openModal(settingsModal);
        showStatus('Please configure your Groq API Key to start chatting.', 'error');
        return;
      }

      // Reset input UI
      chatInput.value = '';
      adjustTextareaHeight();
      updateInputStats('');
      
      // Send user message
      await sendMessage(message);
    });

    // Modal Control: Settings
    btnSettings.addEventListener('click', () => {
      clearValidationStatus();
      openModal(settingsModal);
    });
    btnCloseSettings.addEventListener('click', () => closeModal(settingsModal));
    
    // Mask/Unmask handlers on focus and blur


    if (groqKeyInput) {
      groqKeyInput.addEventListener('focus', () => {
        groqKeyInput.select();
      });
    }




    // Toggle API Key Visibility for Groq
    if (btnToggleGroqVisibility) {
      btnToggleGroqVisibility.addEventListener('click', () => {
        if (groqKeyInput.type === 'password') {
          groqKeyInput.type = 'text';
          if (svgGroqEye) svgGroqEye.classList.remove('hidden');
          if (svgGroqEyeOff) svgGroqEyeOff.classList.add('hidden');
        } else {
          groqKeyInput.type = 'password';
          if (svgGroqEye) svgGroqEye.classList.add('hidden');
          if (svgGroqEyeOff) svgGroqEyeOff.classList.remove('hidden');
        }
      });
    }

    // Toggle provider inputs on select change
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        toggleProviderInputs();
      });
    }

    // Save Settings Form
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const activeProv = 'groq';
      const groqKeyVal = groqKeyInput ? groqKeyInput.value.trim() : '';
      const groqKey = groqKeyVal;

      setSaveButtonLoading(true);
      showStatus('Validating API key with Groq...', 'pending');

      if (isClientOnlyMode) {
        try {
          if (groqKey) {
            const valRes = await fetch('https://api.groq.com/openai/v1/models', {
              headers: { 'Authorization': `Bearer ${groqKey}` }
            });
            if (!valRes.ok && valRes.status !== 429) {
              throw new Error('Invalid Groq API Key. Please check your key and try again.');
            }
          }

          localStorage.removeItem('gemini_api_key');
          localStorage.setItem('groq_api_key', groqKey);
          localStorage.setItem('active_provider', 'groq');

          groqApiKey = groqKey;
          activeProvider = 'groq';

          showStatus('Settings saved and verified successfully!', 'success');
          
          groqKeyInput.value = groqApiKey;
          
          hasApiKey = !!groqApiKey;
          const hasAccess = !!sessionToken;
          btnSend.disabled = chatInput.value.trim() === '' || !hasAccess;
          
          updateSettingsButtonVisibility();

          setTimeout(() => {
            closeModal(settingsModal);
          }, 1000);
        } catch (err) {
          showStatus(err.message || 'Failed to validate API Key.', 'error');
        } finally {
          setSaveButtonLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activeProvider: 'groq',
            apiKey: '',
            groqApiKey: groqKey
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          showStatus('Settings saved and verified successfully!', 'success');
          activeProvider = 'groq';
          groqApiKey = groqKeyVal;

          groqKeyInput.value = groqApiKey;
          
          hasApiKey = !!groqApiKey;
          const hasAccess = !!sessionToken;
          btnSend.disabled = chatInput.value.trim() === '' || !hasAccess;
          
          setTimeout(() => {
            closeModal(settingsModal);
          }, 1000);
        } else {
          showStatus(data.error || 'Failed to validate API Key.', 'error');
        }
      } catch (err) {
        showStatus('Network error occurred during validation.', 'error');
      } finally {
        setSaveButtonLoading(false);
      }
    });

    // Modal Control: Clear history
    btnClear.addEventListener('click', () => openModal(clearConfirmModal));
    btnCancelClear.addEventListener('click', () => closeModal(clearConfirmModal));
    btnConfirmClear.addEventListener('click', async () => {
      if (isClientOnlyMode) {
        const userId = getUserIdFromToken();
        const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
        const updatedHistory = allHistory.filter(msg => msg.user_id !== userId);
        localStorage.setItem('local_chats', JSON.stringify(updatedHistory));
        closeModal(clearConfirmModal);
        cachedHistory = [];
        await loadHistory();
        return;
      }

      try {
        const headers = {};
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const response = await fetch('/api/history', { method: 'DELETE', headers });
        if (response.ok) {
          closeModal(clearConfirmModal);
          cachedHistory = [];
          await loadHistory();
        } else {
          alert('Failed to clear history.');
        }
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    });

    // Modal Control: Delete individual chat item
    btnCancelDelete.addEventListener('click', () => {
      closeModal(deleteConfirmModal);
      chatTimestampToDelete = null;
    });
    
    btnConfirmDelete.addEventListener('click', async () => {
      if (!chatTimestampToDelete) return;
      
      // Disable button while deleting to prevent double-clicks
      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'Deleting...';
      
      if (isClientOnlyMode) {
        try {
          const userId = getUserIdFromToken();
          const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
          
          // Filter out matching session or timestamp scoped to this user
          const updatedHistory = allHistory.filter(msg => {
            const isTargetUser = msg.user_id === userId;
            const matchesTarget = msg.session_id === chatTimestampToDelete || msg.timestamp === chatTimestampToDelete;
            return !(isTargetUser && matchesTarget);
          });
          
          localStorage.setItem('local_chats', JSON.stringify(updatedHistory));
          closeModal(deleteConfirmModal);
          
          if (chatTimestampToDelete === currentSessionId) {
            startNewSession();
          }
          chatTimestampToDelete = null;
          await loadHistory();
        } catch (err) {
          console.error('Error deleting local chat:', err);
          alert('Failed to delete chat locally.');
        } finally {
          btnConfirmDelete.disabled = false;
          btnConfirmDelete.textContent = 'Delete';
        }
        return;
      }

      try {
        const response = await fetch('/api/history/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ session_id: chatTimestampToDelete, timestamp: chatTimestampToDelete })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          closeModal(deleteConfirmModal);
          if (chatTimestampToDelete === currentSessionId) {
            startNewSession();
          }
          chatTimestampToDelete = null;
          await loadHistory();
        } else {
          console.error('Delete failed:', result);
          alert(result.error || 'Failed to delete chat item. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting chat item:', error);
        alert('Network error while deleting chat. Please try again.');
      } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'Delete';
      }
    });

    // Modal Control: Export
    btnExport.addEventListener('click', () => openModal(exportModal));
    btnCloseExport.addEventListener('click', () => closeModal(exportModal));
    
    if (btnExportJson) {
      btnExportJson.addEventListener('click', (e) => {
        if (isClientOnlyMode) {
          e.preventDefault();
          const userId = getUserIdFromToken();
          const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
          const userHistory = allHistory.filter(msg => msg.user_id === userId);
          
          const jsonStr = JSON.stringify(userHistory, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chat_history.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    }

    if (btnExportTxt) {
      btnExportTxt.addEventListener('click', (e) => {
        if (isClientOnlyMode) {
          e.preventDefault();
          const userId = getUserIdFromToken();
          const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
          const userHistory = allHistory.filter(msg => msg.user_id === userId);
          
          let txtContent = `=== AI Assistant Chat History (Local Browser DB) ===\n`;
          txtContent += `User Profile: ${localStorage.getItem('local_session_email') || 'Local User'}\n\n`;
          userHistory.forEach((msg) => {
            const date = new Date(msg.timestamp).toLocaleString();
            const roleName = msg.role === 'user' ? 'User' : 'Assistant';
            txtContent += `[${date}] ${roleName}:\n${msg.text}\n\n----------------------------------------\n\n`;
          });
          
          const blob = new Blob([txtContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = 'chat_history.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    }
    
    // Close modals on clicking overlay background
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target);
      }
    });
  }

  // Send Message and handle stream responses
  async function sendMessage(messageText) {
    isStreaming = true;
    btnSend.disabled = true;
    chatInput.disabled = true;
    
    // Hide empty state, ensure list is visible
    emptyState.classList.add('hidden');
    messageList.classList.remove('hidden');

    // 1. Render User Message immediately
    const userTimestamp = new Date().toISOString();
    appendMessageUI('user', messageText, userTimestamp);
    scrollToBottom();

    // Cache user message locally
    cachedHistory.push({ role: 'user', text: messageText, timestamp: userTimestamp, session_id: currentSessionId });
    renderSidebarHistory(cachedHistory);

    // Save user message to server or local history
    if (isClientOnlyMode) {
      try {
        const userId = getUserIdFromToken();
        const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
        allHistory.push({
          role: 'user',
          text: messageText,
          timestamp: userTimestamp,
          session_id: currentSessionId,
          user_id: userId
        });
        localStorage.setItem('local_chats', JSON.stringify(allHistory));
      } catch (err) {
        console.warn('Failed to save user message locally:', err);
      }
    } else {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        await fetch('/api/history', {
          method: 'POST',
          headers,
          body: JSON.stringify({ role: 'user', text: messageText, timestamp: userTimestamp, session_id: currentSessionId })
        });
      } catch (err) {
        console.warn('Failed to save user message to server history:', err);
      }
    }

    // 2. Show Typing Indicator
    typingIndicator.classList.remove('hidden');
    scrollToBottom();

    let modelMsgWrapper = null;
    let modelBubble = null;
    let accumulatedResponse = '';

    try {
      // Get the API key from the local memory variable
      let currentApiKey = groqApiKey;
      if (!currentApiKey) {
        throw new Error('Groq API key is not configured. Please set the API key in Settings.');
      }

      // Format messages for Groq chat messages structure
      const messages = [
        { role: 'system', content: 'You are a helpful AI Assistant. Be concise, accurate and friendly.' }
      ];
      
      try {
        // Attempt to load history for context
        const histHeaders = {};
        if (sessionToken) {
          histHeaders['Authorization'] = `Bearer ${sessionToken}`;
        }
        const historyResponse = await fetch('/api/history', { headers: histHeaders });
        if (historyResponse.ok) {
          const latestHistory = await historyResponse.json();
          // Filter history for current session if session ID is set
          const sessionHistory = currentSessionId 
            ? latestHistory.filter(msg => msg.session_id === currentSessionId)
            : latestHistory;
          
          // Get the last 10 messages for context
          const contextMessages = sessionHistory.slice(-10);
          
          contextMessages.forEach(msg => {
            const role = msg.role === 'model' ? 'assistant' : 'user';
            if (msg.text) {
              messages.push({ role, content: msg.text });
            }
          });
        }
      } catch (histErr) {
        console.warn('Failed to load history context, sending message without context:', histErr);
      }
      
      // Ensure the current user message is present at the end
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== messageText) {
        messages.push({ role: 'user', content: messageText });
      }

      let response;
      let retries = 3;
      let delay = 2000;
      
      for (let i = 0; i < retries; i++) {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentApiKey}`
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages,
            stream: true
          })
        });
        
        if (response.status === 429) {
          if (i < retries - 1) {
            console.warn(`Rate limit hit (429). Retrying in ${delay}ms...`);
            
            // Show retry feedback in UI
            let statusText = typingIndicator.querySelector('.retry-status-text');
            if (!statusText) {
              statusText = document.createElement('div');
              statusText.className = 'retry-status-text';
              typingIndicator.appendChild(statusText);
            }
            
            // Real-time countdown
            const waitSeconds = delay / 1000;
            for (let s = waitSeconds; s > 0; s--) {
              statusText.innerHTML = `
                <svg class="retry-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
                </svg>
                Rate limit reached. Retrying in ${s}s... (Attempt ${i + 1} of ${retries})
              `;
              await new Promise(r => setTimeout(r, 1000));
            }
            
            statusText.remove();
            delay *= 2;
            continue;
          }
        }
        break;
      }

      if (!response.ok) {
        let errMsg = 'Groq API connection error.';
        try {
          const errData = await response.json();
          errMsg = errData.error?.message || errMsg;
        } catch (e) {
          try { errMsg = await response.text(); } catch (e2) {}
        }
        
        // Provide user-friendly error messages
        if (response.status === 400 && errMsg.includes('API_KEY')) {
          throw new Error('Invalid API key. Please check your Groq API key in Settings.');
        } else if (response.status === 403) {
          throw new Error('API key does not have permission. Please verify your Groq API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
        }
        throw new Error(errMsg);
      }

      // Read the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let streamStarted = false;
      let buffer = '';
      const modelTimestamp = new Date().toISOString();

      const processLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) return;
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') return;
        try {
          const data = JSON.parse(dataStr);
          let chunkText = '';
          
          if (data.choices && data.choices[0]?.delta?.content) {
            chunkText = data.choices[0].delta.content;
          }
          
          if (chunkText) {
            // If it's the first chunk, hide typing indicator and set up assistant's message bubble
            if (!streamStarted) {
              streamStarted = true;
              typingIndicator.classList.add('hidden');
              
              const bubbles = appendMessageUI('model', '', modelTimestamp);
              modelMsgWrapper = bubbles.wrapper;
              modelBubble = bubbles.bubble;
            }

            accumulatedResponse += chunkText;
            formatMessageContent(modelBubble, accumulatedResponse);
            scrollToBottom();
          }
        } catch (jsonErr) {
          // Ignore partial JSON parse errors
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer) {
            processLine(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the partial line in buffer
        buffer = lines.pop();

        for (const line of lines) {
          processLine(line);
        }
      }

      // Save complete model response to server or local history
      if (accumulatedResponse) {
        cachedHistory.push({ role: 'model', text: accumulatedResponse, timestamp: modelTimestamp, session_id: currentSessionId });
        if (isClientOnlyMode) {
          try {
            const userId = getUserIdFromToken();
            const allHistory = JSON.parse(localStorage.getItem('local_chats') || '[]');
            allHistory.push({
              role: 'model',
              text: accumulatedResponse,
              timestamp: modelTimestamp,
              session_id: currentSessionId,
              user_id: userId
            });
            localStorage.setItem('local_chats', JSON.stringify(allHistory));
          } catch (err) {
            console.warn('Failed to save assistant response locally:', err);
          }
        } else {
          try {
            const saveHeaders = { 'Content-Type': 'application/json' };
            if (sessionToken) {
              saveHeaders['Authorization'] = `Bearer ${sessionToken}`;
            }
            await fetch('/api/history', {
              method: 'POST',
              headers: saveHeaders,
              body: JSON.stringify({ role: 'model', text: accumulatedResponse, timestamp: modelTimestamp, session_id: currentSessionId })
            });
          } catch (err) {
            console.warn('Failed to save assistant response to server history:', err);
          }
        }
      } else {
        // No response received — show helpful message
        typingIndicator.classList.add('hidden');
        const bubbles = appendMessageUI('model', '', new Date().toISOString());
        bubbles.bubble.innerHTML = `<span style="color: var(--warning-color, #f59e0b);">No response received from Groq. Please try again or check your API key in Settings.</span>`;
        scrollToBottom();
      }

    } catch (err) {
      console.error('Error in send:', err);
      typingIndicator.classList.add('hidden');

      // Append error message to UI with helpful guidance
      let errorMsg = err.message || 'Unable to connect to assistant.';
      if (errorMsg.includes('API key') || errorMsg.includes('API_KEY')) {
        errorMsg += ' Go to Settings (⚙️) to update your API key.';
      }
      
      if (modelBubble) {
        modelBubble.innerHTML = `<span style="color: var(--danger-color);">${errorMsg}</span>`;
      } else {
        const bubbles = appendMessageUI('model', '', new Date().toISOString());
        bubbles.bubble.innerHTML = `<span style="color: var(--danger-color);">${errorMsg}</span>`;
      }
      scrollToBottom();
    } finally {
      isStreaming = false;
      chatInput.disabled = false;
      chatInput.focus();
      const hasAccess = !!sessionToken;
      btnSend.disabled = chatInput.value.trim() === '' || !hasAccess;
    }
  }

  // Append a message bubble to the list viewport
  function appendMessageUI(role, text, timestamp) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${role}`;
    wrapper.setAttribute('data-msg-id', timestamp);

    // Create avatar element
    const avatar = document.createElement('div');
    avatar.className = `message-avatar ${role}`;
    
    if (role === 'user') {
      const email = userEmailDisplay.textContent || 'U';
      const firstLetter = email.charAt(0).toUpperCase();
      avatar.textContent = firstLetter;
      // Add a dynamic background color based on the email character
      const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      const charCode = firstLetter.charCodeAt(0) || 0;
      avatar.style.background = colors[charCode % colors.length];
    } else {
      // AI Sparkle SVG
      avatar.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c.4 3 2.5 5.1 5.5 5.5-3 .4-5.1 2.5-5.5 5.5-.4-3-2.5-5.1-5.5-5.5 3-.4 5.1-2.5 5.5-5.5zM20 14c.2 1.5 1.2 2.5 2.7 2.7-1.5.2-2.5 1.2-2.7 2.7-.2-1.5-1.2-2.5-2.7-2.7 1.5-.2 2.5-1.2 2.7-2.7zM6 16c.1 1 .8 1.7 1.8 1.8-1 .1-1.7.8-1.8 1.8-.1-1-.8-1.7-1.8-1.8 1-.1 1.7-.8 1.8-1.8z" />
        </svg>
      `;
    }

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const modelNameDisplay = 'AI Assistant';
    meta.textContent = `${role === 'user' ? 'You' : modelNameDisplay} • ${timeStr}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (text) {
      formatMessageContent(bubble, text);
    }

    messageContent.appendChild(meta);
    messageContent.appendChild(bubble);
    
    if (role === 'user') {
      wrapper.appendChild(messageContent);
      wrapper.appendChild(avatar);
    } else {
      wrapper.appendChild(avatar);
      wrapper.appendChild(messageContent);
    }
    
    messageList.appendChild(wrapper);

    return { wrapper, bubble };
  }

  // Format message content with Marked + Highlight.js and code styling
  function formatMessageContent(bubbleElement, rawText) {
    // Parse markdown into HTML
    const htmlContent = marked.parse(rawText);
    bubbleElement.innerHTML = htmlContent;

    // Apply Highlight.js and create styled container/header
    const codeBlocks = bubbleElement.querySelectorAll('pre code');
    codeBlocks.forEach(codeBlock => {
      // Syntax highlighting
      hljs.highlightElement(codeBlock);

      const pre = codeBlock.parentNode;
      if (pre && pre.parentNode && !pre.parentNode.classList.contains('code-block-container')) {
        // Create premium copyable wrapper container
        const container = document.createElement('div');
        container.className = 'code-block-container';

        // Extract language class
        let lang = 'code';
        const classes = Array.from(codeBlock.classList);
        const langClass = classes.find(c => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '').toUpperCase();
        } else {
          const hljsClass = classes.find(c => c.startsWith('lang-'));
          if (hljsClass) {
            lang = hljsClass.replace('lang-', '').toUpperCase();
          }
        }

        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
          <span>${lang}</span>
          <button class="btn-copy-code">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy code
          </button>
        `;

        // Copy button event listener
        const copyBtn = header.querySelector('.btn-copy-code');
        copyBtn.addEventListener('click', () => {
          copyToClipboard(codeBlock.textContent, copyBtn);
        });

        // Structure DOM
        pre.parentNode.insertBefore(container, pre);
        container.appendChild(header);
        container.appendChild(pre);
      }
    });
  }

  // Copy to clipboard helper
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const originalHTML = button.innerHTML;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
          <polyline points="20 6 9 17 4 12"/>
        </svg> Copied!
      `;
      setTimeout(() => {
        button.innerHTML = originalHTML;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }

  // Helpers
  function openModal(modal) {
    modal.classList.remove('hidden');
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  // Scroll viewport to bottom
  function scrollToBottom() {
    chatViewport.scrollTop = chatViewport.scrollHeight;
  }

  function adjustTextareaHeight() {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  }

  function updateInputStats(text) {
    const chars = text.length;
    // Simple frontend token estimator: 1 token ≈ 4 characters
    const tokens = Math.ceil(chars / 4);
    
    charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    tokenCount.textContent = `~${tokens} token${tokens !== 1 ? 's' : ''}`;
    
    const hasAccess = !!sessionToken;
    btnSend.disabled = text.trim() === '' || isStreaming || !hasAccess;
  }

  // Save Settings Modal state controllers
  function setSaveButtonLoading(isLoading) {
    if (isLoading) {
      btnSaveSettings.disabled = true;
      saveBtnText.classList.add('hidden');
      saveBtnSpinner.classList.remove('hidden');
    } else {
      btnSaveSettings.disabled = false;
      saveBtnText.classList.remove('hidden');
      saveBtnSpinner.classList.add('hidden');
    }
  }

  function showStatus(message, type) {
    validationStatus.className = `validation-status ${type}`;
    validationStatus.textContent = message;
    validationStatus.classList.remove('hidden');
  }

  function clearValidationStatus() {
    validationStatus.className = 'validation-status hidden';
    validationStatus.textContent = '';
  }

  // Auth helper: show status banners
  function showAuthStatus(element, message, type) {
    element.className = `auth-status ${type}`;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  // Clear auth statuses
  function clearAuthStatuses() {
    signinStatus.className = 'auth-status hidden';
    signinStatus.textContent = '';
    signupStatus.className = 'auth-status hidden';
    signupStatus.textContent = '';
  }

  function clearAuthInputs() {
    signinEmail.value = '';
    signinPassword.value = '';
    signupEmail.value = '';
    signupPassword.value = '';
  }
});
