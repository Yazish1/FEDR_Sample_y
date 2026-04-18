/* =====================================================
   TASKFLOW — Student Dashboard Logic (student.js)
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── ST1: Auth guard ───────────────────────────────────
  const session = TF.requireAuth('student');
  if (!session) return;

  // ── ST2: Dynamic name + avatar ────────────────────────
  document.getElementById('student-name').textContent   = session.name;
  document.getElementById('student-role').textContent   = 'Student';
  document.getElementById('student-avatar').textContent = TF.getInitials(session.name);

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
      if (p === 'assigned')  { updateStats(); renderAssigned(); }
      if (p === 'schedule')  { renderCalendar(); }
      if (p === 'mytasks')   { renderPersonalTasks(); }
      if (p === 'settings')  { loadSettingsData(); }
    });
  });

  // ═══════════════════════════════════════════════════════
  // ST3: STAT CARDS
  // ═══════════════════════════════════════════════════════
  function updateStats() {
    const all    = TF.getAssignments().filter(a => a.studentId === session.id);
    const subs   = TF.getSubmissions();
    const submitted = all.filter(a => subs.some(s => s.assignmentId === a.id)).length;
    const pt     = TF.getPersonalTasks(session.id).length;

    document.getElementById('st-total').textContent     = all.length;
    document.getElementById('st-submitted').textContent = submitted;
    document.getElementById('st-outstanding').textContent = all.length - submitted;
    document.getElementById('st-personal').textContent  = pt;
  }

  // ═══════════════════════════════════════════════════════
  // ST4-ST6: ASSIGNED TASKS TAB
  // ═══════════════════════════════════════════════════════
  function renderAssigned() {
    updateStats();
    // ── ST4: Only this student's tasks ──────────────────
    const assignments = TF.getAssignments().filter(a => a.studentId === session.id);
    const tbody = document.getElementById('st-assigned-tbody');
    tbody.innerHTML = '';

    if (!assignments.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No tasks assigned to you yet.</td></tr>';
      return;
    }

    const subs = TF.getSubmissions();
    assignments.forEach(a => {
      const sub    = subs.find(s => s.assignmentId === a.id);
      const status = sub ? 'submitted' : (a.dueDate && new Date(a.dueDate) < new Date() ? 'overdue' : 'pending');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${escHtml(a.title)}</td>
        <td><span class="pill pill-${a.priority}">${cap(a.priority)}</span></td>
        <td>${TF.fmtDate(a.dueDate)}</td>
        <td><span class="status-badge status-${status}">${cap(status)}</span></td>
        <td>${sub
          ? ''
          : `<button class="btn btn-primary submit-task-btn" style="font-size:0.76rem;padding:0.3rem 0.8rem;" data-id="${a.id}" data-title="${escHtml(a.title)}" data-priority="${a.priority}">Submit</button>`
        }</td>
      `;
      tbody.appendChild(tr);
    });

    // ── ST5: Wire Submit buttons ─────────────────────────
    tbody.querySelectorAll('.submit-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('sub-task-id').value    = btn.dataset.id;
        document.getElementById('sub-task-title').textContent = btn.dataset.title;
        document.getElementById('sub-priority').value  = btn.dataset.priority;
        document.getElementById('sub-note').value       = '';
        openModal('submit-modal', 'submit-overlay');
      });
    });
  }

  // Submit modal confirm
  document.getElementById('btn-confirm-submit').addEventListener('click', () => {
    const id       = document.getElementById('sub-task-id').value;
    const note     = document.getElementById('sub-note').value.trim();
    const priority = document.getElementById('sub-priority').value;
    const a        = TF.getAssignments().find(x => x.id === id);
    if (!a) return;

    const subs = TF.getSubmissions();
    subs.push({
      id:           TF.genId(),
      assignmentId: id,
      studentId:    session.id,
      studentName:  session.name,
      taskTitle:    a.title,
      priority:     a.priority,
      note,
      timestamp:    new Date().toISOString()
    });
    TF.saveSubmissions(subs);

    closeModal('submit-modal', 'submit-overlay');
    // ── ST6: Update badge + remove button ───────────────
    renderAssigned();
    TF.toast('✅ Task submitted successfully!');
  });

  document.querySelectorAll('.submit-cancel').forEach(b =>
    b.addEventListener('click', () => closeModal('submit-modal', 'submit-overlay'))
  );
  document.getElementById('submit-overlay').addEventListener('click', () =>
    closeModal('submit-modal', 'submit-overlay')
  );

  // ═══════════════════════════════════════════════════════
  // ST7-ST10: CALENDAR (My Schedule)
  // ═══════════════════════════════════════════════════════
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let calYear  = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let popupEv  = null;

  function renderCalendar() {
    const now      = new Date();
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay  = new Date(calYear, calMonth + 1, 0);

    document.getElementById('cal-title').textContent = `${MONTHS[calMonth]} ${calYear}`;

    // ── Build events map ─────────────────────────────────
    const evMap = {};
    function addEv(dateStr, ev) {
      if (!dateStr) return;
      const key = dateStr.slice(0, 10);
      if (!evMap[key]) evMap[key] = [];
      evMap[key].push(ev);
    }

    // ── ST7+ST8: Assigned tasks ──────────────────────────
    const subs = TF.getSubmissions();
    TF.getAssignments()
      .filter(a => a.studentId === session.id && a.dueDate)
      .forEach(a => {
        const sub = subs.find(s => s.assignmentId === a.id);
        addEv(a.dueDate, {
          type: 'assignment', title: a.title,
          priority: a.priority, submitted: !!sub,
          note: sub ? sub.note : '', dueDate: a.dueDate,
          status: sub ? 'Submitted' : (a.dueDate && new Date(a.dueDate) < now ? 'Overdue' : 'Pending')
        });
      });

    // ── ST9: Personal events ─────────────────────────────
    TF.getPersonalEvents(session.id).forEach(e => {
      const d = (e.date || '').slice(0, 10);
      addEv(d, { type: 'event', title: e.title, note: e.note || '', date: e.date, status: 'Event' });
    });

    // ── ST12: Personal tasks with due dates ──────────────
    TF.getPersonalTasks(session.id)
      .filter(t => t.dueDate)
      .forEach(t => {
        addEv(t.dueDate, {
          type: 'personal', title: t.title,
          priority: t.priority, done: t.done,
          dueDate: t.dueDate,
          status: t.done ? 'Done' : 'Pending'
        });
      });

    // ── Render grid ──────────────────────────────────────
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    // Day-of-week headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-day-header';
      h.textContent = d;
      grid.appendChild(h);
    });

    // Empty leading cells
    for (let i = 0; i < firstDay.getDay(); i++) {
      const el = document.createElement('div');
      el.className = 'cal-day cal-empty';
      grid.appendChild(el);
    }

    // Day cells
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate();

      const cell = document.createElement('div');
      cell.className = 'cal-day' + (isToday ? ' cal-today' : '');

      const num = document.createElement('div');
      num.className = 'cal-day-num';
      num.textContent = day;
      cell.appendChild(num);

      (evMap[dateStr] || []).forEach(ev => {
        const pill = document.createElement('div');
        pill.className = 'cal-event ' + calEvClass(ev);
        if (ev.type === 'assignment' && ev.submitted) pill.classList.add('cal-ev-submitted');
        pill.textContent = ev.title;
        pill.addEventListener('click', e => { e.stopPropagation(); showEventPopup(ev); });
        cell.appendChild(pill);
      });

      grid.appendChild(cell);
    }
  }

  function calEvClass(ev) {
    if (ev.type === 'event')    return 'cal-ev-event';
    if (ev.type === 'personal') return 'cal-ev-personal';
    // assignment
    if (ev.submitted) return 'cal-ev-submitted';
    return `cal-ev-${ev.priority}`;
  }

  // ── ST7: Month navigation ────────────────────────────
  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  // ── ST10: Event popup ────────────────────────────────
  function showEventPopup(ev) {
    document.getElementById('popup-type').textContent   = ev.type === 'assignment' ? '📋 Assigned Task' : ev.type === 'event' ? '📅 Personal Event' : '✅ Personal Task';
    document.getElementById('popup-title').textContent  = ev.title;
    document.getElementById('popup-date').textContent   = TF.fmtDate(ev.dueDate || ev.date);
    document.getElementById('popup-status').innerHTML   = `<span class="status-badge status-${(ev.status||'').toLowerCase()}">${ev.status || '—'}</span>`;
    document.getElementById('popup-note').textContent   = ev.note || '—';
    if (ev.priority) {
      document.getElementById('popup-priority').textContent  = cap(ev.priority);
      document.getElementById('popup-priority-row').style.display = '';
    } else {
      document.getElementById('popup-priority-row').style.display = 'none';
    }
    openModal('event-popup', 'event-popup-overlay');
  }

  document.getElementById('btn-close-popup').addEventListener('click', () => closeModal('event-popup', 'event-popup-overlay'));
  document.getElementById('event-popup-overlay').addEventListener('click', () => closeModal('event-popup', 'event-popup-overlay'));

  // ── ST9: Add personal event ──────────────────────────
  document.getElementById('btn-add-event').addEventListener('click', () => {
    const title = document.getElementById('ev-title').value.trim();
    const date  = document.getElementById('ev-date').value;
    const note  = document.getElementById('ev-note').value.trim();

    if (!title || !date) { TF.toast('Title and date are required.', 'warn'); return; }

    const events = TF.getPersonalEvents(session.id);
    events.push({ id: TF.genId(), title, date, note });
    TF.savePersonalEvents(session.id, events);

    document.getElementById('ev-title').value = '';
    document.getElementById('ev-date').value  = '';
    document.getElementById('ev-note').value  = '';

    renderCalendar();
    TF.toast('📅 Event added to calendar.');
  });

  // ═══════════════════════════════════════════════════════
  // ST11-ST12: MY TASKS TAB
  // ═══════════════════════════════════════════════════════
  function renderPersonalTasks() {
    updateStats();
    const tasks = TF.getPersonalTasks(session.id);
    const list  = document.getElementById('pt-list');
    list.innerHTML = '';

    if (!tasks.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">No personal tasks yet.</div></div>';
      return;
    }

    tasks.forEach(t => {
      const el = document.createElement('div');
      el.className = 'task-card' + (t.done ? ' done' : '') + ' priority-' + (t.priority || 'low');
      el.innerHTML = `
        <div class="task-card-title" style="${t.done ? 'text-decoration:line-through;' : ''}">${escHtml(t.title)}</div>
        ${t.desc ? `<div class="task-card-desc">${escHtml(t.desc)}</div>` : ''}
        <div class="task-card-footer">
          <span>${t.dueDate ? TF.fmtDate(t.dueDate) : 'No due date'}</span>
          <span class="pill pill-${t.priority || 'low'}">${cap(t.priority || 'low')}</span>
        </div>
        <div class="task-card-actions">
          <button class="icon-btn success pt-done-btn" data-id="${t.id}">${t.done ? '↩ Undo' : '✓ Done'}</button>
          <button class="icon-btn danger pt-del-btn" data-id="${t.id}">🗑 Delete</button>
        </div>
      `;
      list.appendChild(el);

      el.querySelector('.pt-done-btn').addEventListener('click', () => {
        const tasks = TF.getPersonalTasks(session.id);
        const idx   = tasks.findIndex(x => x.id === t.id);
        if (idx !== -1) tasks[idx].done = !tasks[idx].done;
        TF.savePersonalTasks(session.id, tasks);
        renderPersonalTasks();
      });

      el.querySelector('.pt-del-btn').addEventListener('click', () => {
        if (!confirm(`Delete "${t.title}"?`)) return;
        const updated = TF.getPersonalTasks(session.id).filter(x => x.id !== t.id);
        TF.savePersonalTasks(session.id, updated);
        renderPersonalTasks();
        TF.toast('Task deleted.');
      });
    });
  }

  document.getElementById('btn-add-pt').addEventListener('click', () => {
    const title    = document.getElementById('pt-title').value.trim();
    const desc     = document.getElementById('pt-desc').value.trim();
    const priority = document.getElementById('pt-priority').value || 'low';
    const dueDate  = document.getElementById('pt-date').value;

    if (!title) { TF.toast('Title is required.', 'warn'); return; }

    const tasks = TF.getPersonalTasks(session.id);
    tasks.push({ id: TF.genId(), title, desc, priority, dueDate, done: false, createdAt: new Date().toISOString() });
    TF.savePersonalTasks(session.id, tasks);

    ['pt-title','pt-desc','pt-date'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pt-priority').value = '';

    renderPersonalTasks();
    TF.toast('✅ Personal task added.');
  });

  // ═══════════════════════════════════════════════════════
  // ST13-ST15: SETTINGS TAB
  // ═══════════════════════════════════════════════════════
  function loadSettingsData() {
    const s = TF.getSession();
    document.getElementById('st-s-name').value  = s.name;
    document.getElementById('st-s-email').value = s.email;
    document.getElementById('st-s-pass').value  = '';
    document.getElementById('st-s-pass2').value = '';

    const assigned = TF.getAssignments().filter(a => a.studentId === s.id).length;
    const personal = TF.getPersonalTasks(s.id).length;
    document.getElementById('st-data-assigned').textContent = assigned;
    document.getElementById('st-data-personal').textContent = personal;
  }

  // ── ST13: Save profile ───────────────────────────────
  document.getElementById('btn-save-student-profile').addEventListener('click', () => {
    const name  = document.getElementById('st-s-name').value.trim();
    const email = document.getElementById('st-s-email').value.trim().toLowerCase();
    const pass  = document.getElementById('st-s-pass').value;
    const pass2 = document.getElementById('st-s-pass2').value;

    if (!name || !email) { TF.toast('Name and email are required.', 'warn'); return; }
    if (pass && pass.length < 6) { TF.toast('New password must be at least 6 characters.', 'warn'); return; }
    if (pass && pass !== pass2)  { TF.toast('Passwords do not match.', 'warn'); return; }

    const users   = TF.getUsers();
    const cur     = TF.getSession();
    const idx     = users.findIndex(u => u.id === cur.id);
    if (idx !== -1) {
      users[idx].name  = name;
      users[idx].email = email;
      if (pass) users[idx].password = pass;
      TF.saveUsers(users);
    }

    const updated = { ...cur, name, email };
    TF.setSession(updated);
    document.getElementById('student-name').textContent   = name;
    document.getElementById('student-avatar').textContent = TF.getInitials(name);
    TF.toast('✅ Profile saved.');
  });

  // ── ST15: Clear personal tasks ───────────────────────
  document.getElementById('btn-clear-student').addEventListener('click', () => {
    if (!confirm('Delete all your personal tasks? This cannot be undone.')) return;
    TF.savePersonalTasks(session.id, []);
    loadSettingsData();
    TF.toast('Personal tasks cleared.');
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
});