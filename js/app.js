/* =====================================================
   TASKFLOW — Shared Data & Utility Layer (app.js)
   ===================================================== */

const TF = {
  // ── Storage Keys ─────────────────────────────────────
  USERS:       'tf_users',
  SESSION:     'tf_session',
  ASSIGNMENTS: 'tf_assignments',
  SUBMISSIONS: 'tf_submissions',
  ptKey: uid  => `tf_pt_${uid}`,
  peKey: uid  => `tf_pe_${uid}`,

  // ── Users ─────────────────────────────────────────────
  getUsers()        { try { return JSON.parse(localStorage.getItem(this.USERS)  || '[]'); } catch { return []; } },
  saveUsers(u)      { localStorage.setItem(this.USERS,  JSON.stringify(u)); },

  // ── Session ───────────────────────────────────────────
  getSession()      { try { return JSON.parse(localStorage.getItem(this.SESSION)); } catch { return null; } },
  setSession(u)     { localStorage.setItem(this.SESSION, JSON.stringify(u)); },
  clearSession()    { localStorage.removeItem(this.SESSION); },

  // ── Assignments ───────────────────────────────────────
  getAssignments()  { try { return JSON.parse(localStorage.getItem(this.ASSIGNMENTS) || '[]'); } catch { return []; } },
  saveAssignments(a){ localStorage.setItem(this.ASSIGNMENTS, JSON.stringify(a)); },

  // ── Submissions ───────────────────────────────────────
  getSubmissions()  { try { return JSON.parse(localStorage.getItem(this.SUBMISSIONS) || '[]'); } catch { return []; } },
  saveSubmissions(s){ localStorage.setItem(this.SUBMISSIONS, JSON.stringify(s)); },

  // ── Personal Tasks (per student) ──────────────────────
  getPersonalTasks(uid) { try { return JSON.parse(localStorage.getItem(this.ptKey(uid)) || '[]'); } catch { return []; } },
  savePersonalTasks(uid, t){ localStorage.setItem(this.ptKey(uid), JSON.stringify(t)); },

  // ── Personal Events (per student) ─────────────────────
  getPersonalEvents(uid) { try { return JSON.parse(localStorage.getItem(this.peKey(uid)) || '[]'); } catch { return []; } },
  savePersonalEvents(uid, e){ localStorage.setItem(this.peKey(uid), JSON.stringify(e)); },

  // ── Utilities ─────────────────────────────────────────
  genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  getInitials(name) {
    if (!name) return '??';
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  },

  fmtDateTime(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return isoStr; }
  },

  // ── Assignment helpers ────────────────────────────────
  getAssignmentStatus(a) {
    const subs = this.getSubmissions();
    const sub  = subs.find(s => s.assignmentId === a.id);
    if (sub) return 'submitted';
    if (a.dueDate && new Date(a.dueDate) < new Date()) return 'overdue';
    return 'pending';
  },

  getSubmissionFor(assignmentId) {
    return this.getSubmissions().find(s => s.assignmentId === assignmentId) || null;
  },

  // ── Auth guard ────────────────────────────────────────
  requireAuth(role) {
    const s = this.getSession();
    if (!s || s.role !== role) {
      location.href = 'login.html';
      return null;
    }
    return s;
  },

  // ── Toast ─────────────────────────────────────────────
  toast(msg, type = '') {
    const c = document.querySelector('.toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2700);
  }
};

// ── Backward-compat stub (old pages removed, but ui.js may call loadTasks) ──
function loadTasks() { return []; }