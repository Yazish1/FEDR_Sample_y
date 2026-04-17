/* =====================================================
   TASKFLOW — Shared App State & Utilities (app.js)
   ===================================================== */

// ===== STORAGE =====
// FIX 19: STORAGE_KEY typo corrected ('taks' → 'tasks');
//         loadTasks() now uses the same constant so data persists across pages
const STORAGE_KEY = 'taskflow_tasks';

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// ===== TASK HELPERS =====
function createTask(title, desc, priority, dueDate) {
  return {
    id: Date.now(),
    title: title.trim(),
    desc: desc.trim(),
    priority,   // 'high' | 'medium' | 'low'
    dueDate,
    done: false,
    archived: false,
    createdAt: new Date().toISOString()
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  // FIX 20: both day and month now use '2-digit' for consistent output e.g. "04/05/2025"
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(new Date().toDateString());
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ===== TOAST =====
function showToast(msg, duration = 2500) {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ===== MODAL HELPERS =====
function openModal(modalId, overlayId) {
  document.getElementById(modalId)?.classList.add('open');
  document.getElementById(overlayId)?.classList.add('open');
}

function closeModal(modalId, overlayId) {
  document.getElementById(modalId)?.classList.remove('open');
  document.getElementById(overlayId)?.classList.remove('open');
}

// ===== KEYBOARD =====
// FIX 16: 'Esc' → 'Escape' so modal closes correctly on modern browsers
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
  }
});

// ===== NAV ACTIVE STATE =====
// FIX 15b: compare href attribute to current filename instead of innerHTML
(function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('href') === page) item.classList.add('active');
  });
})();

// ===== MOBILE SIDEBAR TOGGLE =====
(function initSidebarToggle() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay?.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay?.classList.remove('open');
  }

  toggle.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);
})();
