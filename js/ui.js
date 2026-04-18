/* =====================================================
   TASKFLOW — UI Helpers (ui.js)
   ===================================================== */

// ── Modal helpers ──────────────────────────────────────
function openModal(modalId, overlayId) {
  document.getElementById(modalId)?.classList.add('open');
  if (overlayId) document.getElementById(overlayId)?.classList.add('open');
}

function closeModal(modalId, overlayId) {
  document.getElementById(modalId)?.classList.remove('open');
  if (overlayId) document.getElementById(overlayId)?.classList.remove('open');
}

// ── Mobile sidebar toggle ──────────────────────────────
function initSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay && overlay.classList.toggle('open');
  });
  overlay && overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ── Settings inner-tab switcher ────────────────────────
function initSettingsTabs(root) {
  const el = root || document;
  el.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      el.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const panel = item.dataset.tab;
      el.querySelectorAll('.settings-panel').forEach(p => {
        p.style.display = (p.dataset.panel === panel) ? 'flex' : 'none';
      });
    });
  });
}

// ── Auto-init on DOM ready ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initSettingsTabs();
});