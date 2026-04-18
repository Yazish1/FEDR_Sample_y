/* =====================================================
   TASKFLOW — Teacher Dashboard Logic (teacher.js)
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── T1: Auth guard ────────────────────────────────────
  const session = TF.requireAuth('teacher');
  if (!session) return;

  // ── T2: Dynamic name + avatar ─────────────────────────
  document.getElementById('teacher-name').textContent   = session.name;
  document.getElementById('teacher-role').textContent   = 'Teacher';
  document.getElementById('teacher-avatar').textContent = TF.getInitials(session.name);

  // ── L8: Sign Out ──────────────────────────────────────
  document.getElementById('btn-signout').addEventListener('click', () => {
    TF.clearSession();
    location.href = 'login.html';
  });

  // ═══════════════════════════════════════════════════════
  // MAIN TAB SWITCHING
  // ═══════════════════════════════════════════════════════
  const mainTabs = document.querySelectorAll('.main-tab');
  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mainTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const p = tab.dataset.tab;
      document.querySelectorAll('.main-panel').forEach(panel => {
        panel.style.display = panel.dataset.panel === p ? '' : 'none';
      });
      if (p === 'assigned')     { updateStats(); renderAssigned(); }
      if (p === 'submissions')  { renderSubmissions(); }
      if (p === 'settings')     { loadSettingsData(); }
    });
  });

  // ═══════════════════════════════════════════════════════
  // T3: STAT CARDS
  // ═══════════════════════════════════════════════════════
  function updateStats() {
    const assignments = TF.getAssignments();
    const submissions = TF.getSubmissions();
    const total    = assignments.length;
    const submitted = assignments.filter(a => submissions.some(s => s.assignmentId === a.id)).length;
    const pending  = total - submitted;
    const rate     = total ? Math.round((submitted / total) * 100) : 0;

    document.getElementById('stat-total').textContent    = total;
    document.getElementById('stat-submitted').textContent = submitted;
    document.getElementById('stat-pending').textContent  = pending;
    document.getElementById('stat-rate').textContent     = rate + '%';
    const fill = document.querySelector('#stat-rate-card .progress-fill');
    if (fill) fill.style.width = rate + '%';
  }

  // ═══════════════════════════════════════════════════════
  // T4-T6: ASSIGN TASK MODAL
  // ═══════════════════════════════════════════════════════
  const assignModal   = document.getElementById('assign-modal');
  const assignOverlay = document.getElementById('assign-overlay');

  document.getElementById('btn-assign').addEventListener('click', () => {
    populateStudentList();
    openModal('assign-modal', 'assign-overlay');
  });

  document.querySelectorAll('.assign-cancel').forEach(b => {
    b.addEventListener('click', () => closeModal('assign-modal', 'assign-overlay'));
  });
  assignOverlay.addEventListener('click', () => closeModal('assign-modal', 'assign-overlay'));

  function populateStudentList() {
    // ── T4: Dynamic student list from stored accounts ───
    const students = TF.getUsers().filter(u => u.role === 'student');
    const list = document.getElementById('student-checklist');
    list.innerHTML = '';

    if (!students.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.84rem;padding:0.5rem 0;">No students registered yet.</p>';
      document.getElementById('select-all-students').parentElement.style.display = 'none';
      return;
    }

    document.getElementById('select-all-students').parentElement.style.display = '';

    students.forEach(s => {
      const row = document.createElement('label');
      row.className = 'student-check-row';
      row.innerHTML = `
        <input type="checkbox" class="student-cb" value="${s.id}" data-name="${s.name}" />
        <span class="avatar" style="width:28px;height:28px;font-size:0.7rem;">${TF.getInitials(s.name)}</span>
        <span style="font-size:0.86rem;">${s.name}</span>
      `;
      list.appendChild(row);
    });

    // Individual checkbox -> update select-all state
    list.querySelectorAll('.student-cb').forEach(cb => {
      cb.addEventListener('change', syncSelectAll);
    });
  }

  // ── T6: Select-all checkbox ──────────────────────────
  document.getElementById('select-all-students').addEventListener('change', function () {
    document.querySelectorAll('.student-cb').forEach(cb => cb.checked = this.checked);
  });

  function syncSelectAll() {
    const all = document.querySelectorAll('.student-cb');
    const checked = document.querySelectorAll('.student-cb:checked');
    const sa = document.getElementById('select-all-students');
    sa.checked = all.length === checked.length;
    sa.indeterminate = checked.length > 0 && checked.length < all.length;
  }

  // ── T5: Submit assign form ───────────────────────────
  document.getElementById('btn-save-assign').addEventListener('click', () => {
    const title    = document.getElementById('a-title').value.trim();
    const desc     = document.getElementById('a-desc').value.trim();
    const priority = document.getElementById('a-priority').value;
    const dueDate  = document.getElementById('a-date').value;
    const selected = [...document.querySelectorAll('.student-cb:checked')];

    if (!title)          { TF.toast('Please enter a task title.', 'warn'); return; }
    if (!priority)       { TF.toast('Please select a priority.', 'warn'); return; }
    if (!selected.length){ TF.toast('Please select at least one student.', 'warn'); return; }

    const assignments = TF.getAssignments();
    selected.forEach(cb => {
      assignments.push({
        id:          TF.genId(),
        title,
        desc,
        priority,
        dueDate,
        studentId:   cb.value,
        studentName: cb.dataset.name,
        createdAt:   new Date().toISOString()
      });
    });
    TF.saveAssignments(assignments);

    // Reset form
    ['a-title','a-desc','a-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('a-priority').value = '';
    document.querySelectorAll('.student-cb').forEach(cb => cb.checked = false);
    document.getElementById('select-all-students').checked = false;

    closeModal('assign-modal', 'assign-overlay');
    TF.toast(`✅ Task assigned to ${selected.length} student${selected.length > 1 ? 's' : ''}.`);
    updateStats();
    renderAssigned();
  });

  // ═══════════════════════════════════════════════════════
  // T7-T10, T12: ASSIGNED TASKS TABLE
  // ═══════════════════════════════════════════════════════
  let searchQuery = '';
  let expandedRow = null;

  document.getElementById('task-search').addEventListener('input', function () {
    searchQuery = this.value.toLowerCase();
    renderAssigned();
  });

  function renderAssigned() {
    updateStats();
    const assignments = TF.getAssignments();
    const tbody = document.getElementById('assigned-tbody');
    tbody.innerHTML = '';

    // ── T12: Filter by search ────────────────────────────
    const filtered = assignments.filter(a =>
      a.title.toLowerCase().includes(searchQuery) ||
      a.studentName.toLowerCase().includes(searchQuery)
    );

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">
        ${assignments.length ? 'No tasks match your search.' : 'No tasks assigned yet. Click <strong>Assign Task</strong> to get started.'}
      </td></tr>`;
      return;
    }

    filtered.forEach(a => {
      const status = TF.getAssignmentStatus(a);
      const sub    = TF.getSubmissionFor(a.id);

      // ── T7: Main row ─────────────────────────────────
      const tr = document.createElement('tr');
      tr.className = 'assignment-row';
      tr.dataset.id = a.id;
      tr.innerHTML = `
        <td style="font-weight:600;">${escHtml(a.title)}</td>
        <td>${escHtml(a.studentName)}</td>
        <td><span class="pill pill-${a.priority}">${cap(a.priority)}</span></td>
        <td>${TF.fmtDate(a.dueDate)}</td>
        <td>${statusBadge(status)}</td>
        <td>
          <button class="icon-btn danger delete-btn" data-id="${a.id}" title="Delete">🗑</button>
        </td>
      `;

      // ── T9: Expandable detail row ─────────────────────
      const detailTr = document.createElement('tr');
      detailTr.className = 'detail-row';
      detailTr.dataset.id = a.id;
      detailTr.style.display = 'none';
      detailTr.innerHTML = `
        <td colspan="6">
          <div class="detail-panel">
            <div class="detail-grid">
              <div><span class="detail-label">Student</span><span>${escHtml(a.studentName)}</span></div>
              <div><span class="detail-label">Status</span><span>${statusBadge(status)}</span></div>
              <div><span class="detail-label">Submitted</span><span>${sub ? TF.fmtDateTime(sub.timestamp) : '—'}</span></div>
              <div><span class="detail-label">Note</span><span>${sub && sub.note ? escHtml(sub.note) : '—'}</span></div>
            </div>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
      tbody.appendChild(detailTr);

      // ── T9: Toggle expand on row click ───────────────
      tr.addEventListener('click', e => {
        if (e.target.closest('.delete-btn')) return;
        const isOpen = detailTr.style.display !== 'none';
        // Collapse all others
        tbody.querySelectorAll('.detail-row').forEach(r => r.style.display = 'none');
        tbody.querySelectorAll('.assignment-row').forEach(r => r.classList.remove('expanded'));
        if (!isOpen) {
          detailTr.style.display = '';
          tr.classList.add('expanded');
        }
      });

      // ── T10: Delete with confirmation ─────────────────
      tr.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm(`Delete assignment "${a.title}" for ${a.studentName}?`)) return;
        const updated = TF.getAssignments().filter(x => x.id !== a.id);
        TF.saveAssignments(updated);
        // Also remove associated submission
        const subs = TF.getSubmissions().filter(s => s.assignmentId !== a.id);
        TF.saveSubmissions(subs);
        renderAssigned();
        TF.toast('Assignment deleted.');
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  // T11: SUBMISSIONS TAB
  // ═══════════════════════════════════════════════════════
  function renderSubmissions() {
    const subs = [...TF.getSubmissions()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const tbody = document.getElementById('subs-tbody');
    tbody.innerHTML = '';

    if (!subs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No submissions yet.</td></tr>';
      return;
    }

    subs.forEach(s => {
      const a = TF.getAssignments().find(x => x.id === s.assignmentId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escHtml(s.studentName)}</td>
        <td style="font-weight:600;">${escHtml(s.taskTitle)}</td>
        <td><span class="pill pill-${s.priority || 'low'}">${cap(s.priority || 'low')}</span></td>
        <td>${TF.fmtDateTime(s.timestamp)}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;">${s.note ? escHtml(s.note) : '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ═══════════════════════════════════════════════════════
  // T13-T15: SETTINGS TAB
  // ═══════════════════════════════════════════════════════
  function loadSettingsData() {
    // Pre-fill profile
    const s = TF.getSession();
    document.getElementById('t-s-name').value  = s.name;
    document.getElementById('t-s-email').value = s.email;
    document.getElementById('t-s-pass').value  = '';
    document.getElementById('t-s-pass2').value = '';

    // Data management counts
    const assignments = TF.getAssignments();
    const students    = TF.getUsers().filter(u => u.role === 'student');
    document.getElementById('t-data-assignments').textContent = assignments.length;
    document.getElementById('t-data-students').textContent    = students.length;
  }

  // ── T13: Save profile ────────────────────────────────
  document.getElementById('btn-save-teacher-profile').addEventListener('click', () => {
    const name  = document.getElementById('t-s-name').value.trim();
    const email = document.getElementById('t-s-email').value.trim().toLowerCase();
    const pass  = document.getElementById('t-s-pass').value;
    const pass2 = document.getElementById('t-s-pass2').value;

    if (!name || !email) { TF.toast('Name and email are required.', 'warn'); return; }
    if (pass && pass.length < 6) { TF.toast('New password must be at least 6 characters.', 'warn'); return; }
    if (pass && pass !== pass2)  { TF.toast('Passwords do not match.', 'warn'); return; }

    const users   = TF.getUsers();
    const session = TF.getSession();
    const idx     = users.findIndex(u => u.id === session.id);

    if (idx !== -1) {
      users[idx].name  = name;
      users[idx].email = email;
      if (pass) users[idx].password = pass;
      TF.saveUsers(users);
    }

    // Update session
    const updated = { ...session, name, email };
    TF.setSession(updated);
    document.getElementById('teacher-name').textContent   = name;
    document.getElementById('teacher-avatar').textContent = TF.getInitials(name);
    TF.toast('✅ Profile saved.');
  });

  // ── T15: Clear all assignments ───────────────────────
  document.getElementById('btn-clear-teacher').addEventListener('click', () => {
    if (!confirm('Delete ALL assignments and submissions? This cannot be undone.')) return;
    TF.saveAssignments([]);
    TF.saveSubmissions([]);
    loadSettingsData();
    TF.toast('All assignments and submissions deleted.');
  });

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════
  updateStats();
  renderAssigned();

  // ═══════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

  // ── T8: Colour-coded status badge ────────────────────
  function statusBadge(status) {
    const map = { submitted: 'green', pending: 'yellow', overdue: 'red' };
    const cls = map[status] || '';
    return `<span class="status-badge status-${status}">${cap(status)}</span>`;
  }
});