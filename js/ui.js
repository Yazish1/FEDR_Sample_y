/* =====================================================
   TASKFLOW — Page UI Logic (ui.js)
   ===================================================== */

// =====================================================
// TASKS PAGE — tasks.html
// =====================================================
(function initTasksPage() {
  if (!document.getElementById('task-board')) return;

  let tasks = loadTasks();
  let filter = 'all';
  let searchQ = '';

  // ----- Modal -----
  document.getElementById('btn-new-task')?.addEventListener('click', () => {
    openModal('task-modal', 'task-overlay');
  });

  document.getElementById('task-overlay')?.addEventListener('click', () => {
    closeModal('task-modal', 'task-overlay');
  });

  document.getElementById('modal-cancel')?.addEventListener('click', () => {
    closeModal('task-modal', 'task-overlay');
    resetForm();
  });

  // FIX 6: listener now targets the correct ID 'save-task' matching the HTML button
  document.getElementById('save-task')?.addEventListener('click', handleAddTask);

  function resetForm() {
    document.getElementById('f-title').value    = '';
    document.getElementById('f-desc').value     = '';
    document.getElementById('f-priority').value = '';
    document.getElementById('f-date').value     = '';
  }

  function handleAddTask() {
    const title    = document.getElementById('f-title').value.trim();
    const desc     = document.getElementById('f-desc').value.trim();
    const priority = document.getElementById('f-priority').value;
    const dueDate  = document.getElementById('f-date').value;

    // FIX 14: both title and priority are now validated before submission
    if (!title) {
      showToast('⚠️ Please enter a task title.');
      return;
    }
    if (!priority) {
      showToast('⚠️ Please select a priority.');
      return;
    }

    tasks.push(createTask(title, desc, priority, dueDate));
    saveTasks(tasks);
    closeModal('task-modal', 'task-overlay');
    resetForm();
    renderBoard();
    showToast('✅ Task added!');
  }

  // ----- Filter -----
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      renderBoard();
    });
  });

  document.getElementById('task-search')?.addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase();
    renderBoard();
  });

  // ----- Render -----
  function renderBoard() {
    tasks = loadTasks();
    const cols = { high: [], medium: [], low: [] };
    const q = searchQ;

    const activeTasks = tasks.filter(t => !t.archived);

    // FIX 15b: = changed to === so filter reads done state without mutating it
    const visible = activeTasks.filter(t => {
      const match = t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
      if (filter === 'done')    return match && t.done === true;
      if (filter === 'pending') return match && !t.done;
      return match;
    });

    visible.forEach(t => {
      if (cols[t.priority]) cols[t.priority].push(t);
    });

    ['high', 'medium', 'low'].forEach(p => {
      const listEl  = document.getElementById('col-' + p);
      const countEl = document.querySelector(`[data-col-count="${p}"]`);
      if (!listEl) return;

      if (countEl) countEl.textContent = cols[p].length;

      if (cols[p].length === 0) {
        listEl.innerHTML = `
          <div class="empty-state" style="padding:1.5rem 0.5rem;">
            <div class="empty-state-icon" style="font-size:1.5rem;">📭</div>
            <div class="empty-state-text">No ${p} priority tasks</div>
          </div>`;
        return;
      }

      listEl.innerHTML = '';
      cols[p].forEach(task => listEl.appendChild(buildCard(task)));
    });
  }

  function buildCard(task) {
    const card = document.createElement('div');
    // Priority class added so CSS border-left colours apply correctly
    card.className = `task-card priority-${task.priority}${task.done ? ' done' : ''}`;

    const dateStr = task.dueDate ? formatDate(task.dueDate) : '—';
    const overdue = !task.done && isOverdue(task.dueDate);

    card.innerHTML = `
      <div class="task-card-title">${escapeHTML(task.title)}</div>
      ${task.desc ? `<div class="task-card-desc">${escapeHTML(task.desc)}</div>` : ''}
      <div class="task-card-footer">
        <span style="${overdue ? 'color:var(--danger)' : ''}">📅 ${dateStr}</span>
        <span class="pill pill-${task.done ? 'done' : task.priority}">${task.done ? 'Done' : task.priority}</span>
      </div>
      <div class="task-card-actions">
        <button class="icon-btn success" data-action="done"    data-id="${task.id}">
          ${task.done ? '↩ Undo' : '✔ Done'}
        </button>
        <button class="icon-btn"         data-action="archive" data-id="${task.id}">📦 Archive</button>
        <button class="icon-btn danger"  data-action="delete"  data-id="${task.id}">🗑</button>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleCardAction(btn.dataset.action, Number(btn.dataset.id)));
    });

    return card;
  }

  function handleCardAction(action, id) {
    if (action === 'done') {
      // FIX 16b: strict === used for id comparison
      const t = tasks.find(t => t.id === id);
      if (t) { t.done = !t.done; saveTasks(tasks); renderBoard(); }

    } else if (action === 'archive') {
      const t = tasks.find(t => t.id === id);
      if (t) {
        t.archived = true;
        saveTasks(tasks);
        renderBoard();
        showToast('📦 Task archived.');
      }

    } else if (action === 'delete') {
      // FIX 17: condition corrected from === to !== so only the clicked task is removed
      tasks = tasks.filter(t => t.id !== id);
      saveTasks(tasks);
      renderBoard();
      showToast('🗑 Task deleted.');
    }
  }

  renderBoard();
})();


// =====================================================
// DASHBOARD PAGE — index.html
// =====================================================
(function initDashboard() {
  if (!document.getElementById('dash-total')) return;

  function render() {
    const tasks   = loadTasks().filter(t => !t.archived);
    const total   = tasks.length;
    // FIX 18: done counter now correctly uses t.done (not !t.done)
    const done    = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done).length;
    const pct     = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('dash-total').textContent   = total;
    document.getElementById('dash-done').textContent    = done;
    document.getElementById('dash-pending').textContent = pending;
    document.getElementById('dash-pct').textContent     = pct + '%';

    // FIX 3: .progress-fill element now exists in HTML so this correctly updates the bar
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = pct + '%';

    // Recent tasks table
    const tbody = document.getElementById('recent-tasks-body');
    if (!tbody) return;

    const recent = [...tasks].reverse().slice(0, 6);
    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">No tasks yet. <a href="tasks.html" style="color:var(--accent)">Create one →</a></td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(t => `
      <tr>
        <td>${escapeHTML(t.title)}</td>
        <td><span class="pill pill-${t.done ? 'done' : t.priority}">${t.done ? 'Done' : t.priority}</span></td>
        <td>${t.dueDate ? formatDate(t.dueDate) : '—'}</td>
        <td style="color:${t.done ? 'var(--success)' : 'var(--text-muted)'}">
          ${t.done ? '✔ Complete' : '○ Pending'}
        </td>
      </tr>
    `).join('');
  }

  render();
})();


// =====================================================
// ARCHIVE PAGE — archive.html
// =====================================================
(function initArchivePage() {
  if (!document.getElementById('archive-list')) return;

  let searchQ = '';

  document.getElementById('archive-search')?.addEventListener('input', e => {
    searchQ = e.target.value.toLowerCase();
    renderArchive();
  });

  function renderArchive() {
    const allTasks = loadTasks();
    const archived = allTasks.filter(t =>
      t.archived &&
      (t.title.toLowerCase().includes(searchQ) || t.desc.toLowerCase().includes(searchQ))
    );

    const tbody = document.getElementById('archive-list');
    if (!tbody) return;

    if (archived.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2.5rem;">
        ${searchQ ? 'No archived tasks match your search.' : 'Archive is empty.'}
      </td></tr>`;
      return;
    }

    tbody.innerHTML = archived.map(t => `
      <tr>
        <td>${escapeHTML(t.title)}</td>
        <td><span class="pill pill-${t.priority}">${t.priority}</span></td>
        <td>${t.dueDate ? formatDate(t.dueDate) : '—'}</td>
        <td style="color:${t.done ? 'var(--success)' : 'var(--text-muted)'}">
          ${t.done ? '✔ Done' : '○ Incomplete'}
        </td>
        <td>
          <button class="btn btn-ghost restore-btn" data-id="${t.id}">↩ Restore</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tasks = loadTasks();
        const t = tasks.find(x => x.id === Number(btn.dataset.id));
        if (t) {
          t.archived = false;
          saveTasks(tasks);
          renderArchive();
          showToast('↩ Task restored!');
        }
      });
    });
  }

  renderArchive();
})();


// =====================================================
// SETTINGS PAGE — settings.html
// =====================================================
(function initSettingsPage() {
  if (!document.getElementById('settings-root')) return;

  // Settings nav tabs
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const target = item.dataset.tab;
      // FIX 5: assignment = replaced with equality === for correct panel show/hide logic
      document.querySelectorAll('.settings-panel').forEach(p => {
        p.style.display = p.dataset.panel === target ? 'flex' : 'none';
      });
    });
  });

  // Clear all tasks
  document.getElementById('btn-clear-tasks')?.addEventListener('click', () => {
    if (confirm('Delete ALL tasks permanently? This cannot be undone.')) {
      saveTasks([]);
      showToast('🗑 All tasks cleared.');
      const el = document.getElementById('settings-task-count');
      if (el) el.textContent = '0 tasks in storage';
    }
  });

  // Save profile (cosmetic)
  document.getElementById('btn-save-profile')?.addEventListener('click', () => {
    showToast('✅ Profile saved!');
  });
})();
