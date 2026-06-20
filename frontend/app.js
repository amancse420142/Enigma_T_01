// ==========================================================================
// ENIGMA DIARY - FRONTEND CONTROLLER (VANILLA JS)
// Updated by Priyanka11-source
// ==========================================================================

const API_BASE_URL = 'http://localhost:5000/api';

// Application State
let state = {
  token: localStorage.getItem('token') || null,
  user: null,
  notes: [],
  activeEditNoteId: null,
  selectedColor: '#fefbf3', // Default ivory paper background
  authMode: 'login' // 'login' or 'signup'
};

// Default Mock/Demo Notes for unauthenticated preview
const DEMO_NOTES = [
  {
    _id: 'demo-1',
    title: 'Opening the Diary... 🖋️',
    content: 'This journal is a local demonstration. Feel free to jot down daily reflections, draft ideas, or sketch memories.\n\nTo secure your writings permanently, unlock the journal in the top right to sync with your private digital vault (powered by MongoDB)!',
    color: '#fefbf3',
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'demo-2',
    title: 'Wax Seals & Ledger Encryption 🔐',
    content: 'By locking your journal with a unique passphrase, your entries are automatically saved to our Node.js database.\n\nYour data is completely private. Try clicking any note card action (like edit or delete) to see how the authentication modal gates access!',
    color: '#e0f2fe',
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'demo-3',
    title: 'Parchment Textures 📜',
    content: 'Click the small colored squares in the writer form to select your paper style! We support Ivory, Sky Blue, Sage Green, Manila Yellow, Warm Peach, Lavender, and Dusty Rose presets to keep your journal organic, sorted, and beautiful.',
    color: '#dcfce7',
    updatedAt: new Date().toISOString()
  }
];

// DOM Elements
const elements = {
  toastContainer: document.getElementById('toast-container'),
  notesGrid: document.getElementById('notes-grid'),
  emptyState: document.getElementById('empty-state'),
  noteForm: document.getElementById('note-form'),
  noteTitleInput: document.getElementById('note-title-input'),
  noteContentInput: document.getElementById('note-content-input'),
  colorDots: document.querySelectorAll('.color-dot'),
  clearFormBtn: document.getElementById('clear-form-btn'),
  saveNoteBtn: document.getElementById('save-note-btn'),
  editorTitle: document.getElementById('editor-title'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  syncStatus: document.getElementById('sync-status'),
  syncText: document.getElementById('sync-text'),
  syncIndicator: document.querySelector('.status-indicator'),
  
  // Auth Header States
  authLoggedOut: document.getElementById('auth-status-logged-out'),
  authLoggedIn: document.getElementById('auth-status-logged-in'),
  navLoginBtn: document.getElementById('nav-login-btn'),
  navLogoutBtn: document.getElementById('nav-logout-btn'),
  userDisplayName: document.getElementById('user-display-name'),
  
  // Auth Modal
  authModal: document.getElementById('auth-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  authForm: document.getElementById('auth-form'),
  authUsernameInput: document.getElementById('auth-username'),
  authPasswordInput: document.getElementById('auth-password'),
  authTitle: document.getElementById('auth-title'),
  authSubtitle: document.getElementById('auth-subtitle'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  tabLogin: document.getElementById('tab-login'),
  tabSignup: document.getElementById('tab-signup')
};

// ==========================================================================
// TOAST NOTIFICATIONS UTILITY
// ==========================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 4000);
}

// ==========================================================================
// INITIALIZATION & STATE ACTIONS
// ==========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  // Bind UI Events
  setupEventListeners();
  
  // Load State
  if (state.token) {
    const success = await fetchUserProfile();
    if (success) {
      updateAuthUI(true);
      fetchNotes();
    } else {
      logout();
    }
  } else {
    updateAuthUI(false);
    loadDemoNotes();
  }
});

function setupEventListeners() {
  // Note Color Pickers
  elements.colorDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      elements.colorDots.forEach(d => d.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedColor = e.target.getAttribute('data-color');
    });
  });

  // Note Form Handlers
  elements.noteForm.addEventListener('submit', handleNoteFormSubmit);
  elements.clearFormBtn.addEventListener('click', resetNoteForm);
  elements.cancelEditBtn.addEventListener('click', resetNoteForm);

  // Auth Navigation Handlers
  elements.navLoginBtn.addEventListener('click', () => openAuthModal('login'));
  elements.navLogoutBtn.addEventListener('click', logout);
  
  // Auth Modal Controls
  elements.closeModalBtn.addEventListener('click', closeAuthModal);
  elements.tabLogin.addEventListener('click', () => switchAuthMode('login'));
  elements.tabSignup.addEventListener('click', () => switchAuthMode('signup'));
  elements.authForm.addEventListener('submit', handleAuthSubmit);
  
  // Close Modal on backdrop click
  elements.authModal.addEventListener('click', (e) => {
    if (e.target === elements.authModal) {
      closeAuthModal();
    }
  });
}

// ==========================================================================
// AUTHENTICATION LOGIC & MODALS
// ==========================================================================
function openAuthModal(mode = 'login') {
  switchAuthMode(mode);
  elements.authModal.classList.remove('hidden');
  elements.authUsernameInput.focus();
}

function closeAuthModal() {
  elements.authModal.classList.add('hidden');
  elements.authForm.reset();
}

function switchAuthMode(mode) {
  state.authMode = mode;
  if (mode === 'login') {
    elements.tabLogin.classList.add('active');
    elements.tabSignup.classList.remove('active');
    elements.authTitle.textContent = 'Unlock Journal';
    elements.authSubtitle.textContent = 'Verify your signature to open the ledger.';
    elements.authSubmitBtn.querySelector('span').textContent = 'Unlock';
    elements.authPasswordInput.setAttribute('autocomplete', 'current-password');
  } else {
    elements.tabLogin.classList.remove('active');
    elements.tabSignup.classList.add('active');
    elements.authTitle.textContent = 'Register Key';
    elements.authSubtitle.textContent = 'Register a new passphrase key to encrypt your logs.';
    elements.authSubmitBtn.querySelector('span').textContent = 'Register';
    elements.authPasswordInput.setAttribute('autocomplete', 'new-password');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  
  const username = elements.authUsernameInput.value.trim();
  const password = elements.authPasswordInput.value;
  
  const endpoint = state.authMode === 'login' ? '/auth/login' : '/auth/signup';
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }
    
    // Save Token & Setup user state
    localStorage.setItem('token', data.token);
    state.token = data.token;
    state.user = { id: data._id, username: data.username };
    
    showToast(
      state.authMode === 'login' ? `Journal unlocked. Welcome, ${data.username}.` : `Ledger keys registered. Welcome!`, 
      'success'
    );
    
    updateAuthUI(true);
    closeAuthModal();
    
    await fetchNotes();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function fetchUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      state.user = { id: data._id, username: data.username };
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return false;
  }
}

function updateAuthUI(isLoggedIn) {
  if (isLoggedIn) {
    elements.authLoggedOut.classList.add('hidden');
    elements.authLoggedIn.classList.remove('hidden');
    elements.userDisplayName.textContent = state.user ? state.user.username : 'User';
    
    elements.syncIndicator.className = 'status-indicator online';
    elements.syncText.textContent = 'Ledger Synced with MongoDB';
  } else {
    elements.authLoggedOut.classList.remove('hidden');
    elements.authLoggedIn.classList.add('hidden');
    
    elements.syncIndicator.className = 'status-indicator offline';
    elements.syncText.textContent = 'Ledger Locked (Previewing Demo)';
  }
}

function logout() {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  state.notes = [];
  
  resetNoteForm();
  updateAuthUI(false);
  loadDemoNotes();
  
  showToast('Journal closed and locked.', 'info');
}

// ==========================================================================
// NOTES DATA LOGIC (CRUD & RENDER)
// ==========================================================================
function loadDemoNotes() {
  state.notes = [...DEMO_NOTES];
  renderNotes();
}

async function fetchNotes() {
  if (!state.token) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to retrieve notes from database');
    }
    
    state.notes = await response.json();
    renderNotes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderNotes() {
  elements.notesGrid.innerHTML = '';
  
  if (state.notes.length === 0) {
    elements.emptyState.classList.remove('hidden');
    return;
  }
  
  elements.emptyState.classList.add('hidden');
  
  state.notes.forEach(note => {
    const card = document.createElement('div');
    
    const colorClass = getColorClass(note.color);
    card.className = `note-card ${colorClass}`;
    card.setAttribute('data-id', note._id);
    
    const updatedDate = new Date(note.updatedAt);
    const dateStr = updatedDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
    const timeStr = updatedDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    card.innerHTML = `
      <div>
        <div class="note-card-header">
          <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
          <div class="note-card-actions">
            <button class="btn-card-action edit" title="Edit Entry"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-card-action delete" title="Tear Page"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <p class="note-card-body">${escapeHtml(note.content)}</p>
      </div>
      <div class="note-card-footer">
        <span class="note-card-date">
          <i class="fa-regular fa-clock"></i> Recorded ${dateStr} at ${timeStr}
        </span>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-card-action')) return;
      handleNoteClick(note);
    });
    
    card.querySelector('.edit').addEventListener('click', () => {
      handleNoteClick(note);
    });
    
    card.querySelector('.delete').addEventListener('click', () => {
      handleNoteDelete(note._id);
    });
    
    elements.notesGrid.appendChild(card);
  });
}

// Maps warm pastel paper colors to class names in styles.css
function getColorClass(colorCode) {
  switch (colorCode) {
    case '#fefbf3': return 'color-slate';     // Ivory
    case '#e0f2fe': return 'color-indigo';    // Sky Blue
    case '#dcfce7': return 'color-cyan';      // Sage Green
    case '#fef9c3': return 'color-emerald';   // Manila Yellow
    case '#ffedd5': return 'color-amber';     // Warm Peach
    case '#f3e8ff': return 'color-pink';      // Lavender
    case '#fce7f3': return 'color-crimson';   // Dusty Rose
    default: return 'color-slate';
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================================================
// FORM OPERATIONS & CRUD TRIGGERS
// ==========================================================================
async function handleNoteFormSubmit(e) {
  e.preventDefault();
  
  if (!state.token) {
    showToast('Please unlock your journal to record entries.', 'info');
    openAuthModal('signup');
    return;
  }
  
  const title = elements.noteTitleInput.value.trim();
  const content = elements.noteContentInput.value.trim();
  const color = state.selectedColor;
  
  if (!title || !content) return;
  
  const isEditing = state.activeEditNoteId !== null;
  const method = isEditing ? 'PUT' : 'POST';
  const endpoint = isEditing ? `/notes/${state.activeEditNoteId}` : '/notes';
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ title, content, color })
    });
    
    if (!response.ok) {
      throw new Error('Error recording your entry to the database.');
    }
    
    showToast(isEditing ? 'Entry updated in journal.' : 'Entry recorded in journal.', 'success');
    resetNoteForm();
    await fetchNotes();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function handleNoteClick(note) {
  if (!state.token) {
    showToast('Please unlock your journal to edit entries.', 'info');
    openAuthModal('login');
    return;
  }
  
  state.activeEditNoteId = note._id;
  
  elements.noteTitleInput.value = note.title;
  elements.noteContentInput.value = note.content;
  state.selectedColor = note.color;
  
  elements.colorDots.forEach(dot => {
    if (dot.getAttribute('data-color') === note.color) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  
  elements.editorTitle.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Rewrite Log';
  elements.cancelEditBtn.classList.remove('hidden');
  
  elements.noteForm.scrollIntoView({ behavior: 'smooth' });
}

async function handleNoteDelete(noteId) {
  if (!state.token) {
    showToast('Please unlock your journal to edit logs.', 'info');
    openAuthModal('login');
    return;
  }
  
  if (!confirm('Tear this page out of your journal permanently?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to erase entry from database.');
    }
    
    showToast('Page torn and erased.', 'success');
    
    if (state.activeEditNoteId === noteId) {
      resetNoteForm();
    }
    
    await fetchNotes();
    
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function resetNoteForm() {
  elements.noteForm.reset();
  state.activeEditNoteId = null;
  state.selectedColor = '#fefbf3'; // Reset to default Ivory
  
  elements.colorDots.forEach(dot => {
    if (dot.getAttribute('data-color') === '#fefbf3') {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  
  elements.editorTitle.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Write Log';
  elements.cancelEditBtn.classList.add('hidden');
}
