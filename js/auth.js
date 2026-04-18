/* =====================================================
   TASKFLOW — Auth Utilities (auth.js)
   ===================================================== */

const ACCOUNTS_KEY = 'taskflow_accounts';
const SESSION_KEY  = 'taskflow_session';

// ===== ACCOUNTS =====
function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
  catch { return []; }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function findAccountByEmail(email) {
  return loadAccounts().find(a => a.email.toLowerCase() === email.toLowerCase());
}

function registerAccount({ name, email, password, role }) {
  const accounts = loadAccounts();
  const newAccount = {
    id:        Date.now(),
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    password,
    role,
    createdAt: new Date().toISOString()
  };
  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
}

// Returns all student accounts — always read from storage, never hardcoded (L5 / T4)
function loadStudentAccounts() {
  return loadAccounts().filter(a => a.role === 'student');
}

// ===== SESSION =====
function saveSession({ id, name, email, role }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, name, email, role }));
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ===== GUARDS =====
function requireAuth(requiredRole) {
  const session = loadSession();
  if (!session) {
    window.location.replace('login.html');
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    window.location.replace(session.role === 'teacher' ? 'teacher.html' : 'student.html');
    return null;
  }
  return session;
}

// Call on the login page — skips login if already authenticated.
function redirectIfLoggedIn() {
  const session = loadSession();
  if (!session) return;
  window.location.replace(session.role === 'teacher' ? 'teacher.html' : 'student.html');
}

// ===== SIGN-OUT =====
function initSignOut() {
  document.querySelectorAll('[data-signout]').forEach(btn => {
    btn.addEventListener('click', () => {
      clearSession();
      window.location.replace('login.html');
    });
  });
}