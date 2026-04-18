/* =====================================================
   TASKFLOW — Login / Sign-Up Logic (login.js)
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ── L9: Auto-redirect if already logged in ───────────
  const existing = TF.getSession();
  if (existing) {
    location.href = existing.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
    return;
  }

  // ── State ─────────────────────────────────────────────
  let mode = 'signin';   // 'signin' | 'signup'
  let role = 'student';  // 'student' | 'teacher'

  // ── DOM refs ──────────────────────────────────────────
  const modeTabs   = document.querySelectorAll('.auth-tab');
  const roleBtns   = document.querySelectorAll('.role-btn');
  const siForm     = document.getElementById('signin-form');
  const suForm     = document.getElementById('signup-form');
  const errorEl    = document.getElementById('auth-error');
  const submitBtn  = document.getElementById('auth-submit');

  // ── L2: Mode toggle (Sign In / Sign Up) ───────────────
  function setMode(m) {
    mode = m;
    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === m));
    siForm.style.display = m === 'signin' ? '' : 'none';
    suForm.style.display = m === 'signup' ? '' : 'none';
    errorEl.textContent  = '';
    // Change button label + colour
    submitBtn.textContent = m === 'signin' ? 'Sign In' : 'Create Account';
    submitBtn.className   = 'btn btn-auth ' + (m === 'signin' ? 'btn-primary' : 'btn-success');
  }

  modeTabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

  // ── L3: Role selector ─────────────────────────────────
  function setRole(r) {
    role = r;
    roleBtns.forEach(b => b.classList.toggle('active', b.dataset.role === r));
  }

  roleBtns.forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));

  // ── Helpers ───────────────────────────────────────────
  function setError(msg) { errorEl.textContent = msg; }
  function clearError()  { errorEl.textContent = ''; }

  // ── L1 + L6: Sign In ──────────────────────────────────
  function doSignIn() {
    clearError();
    const email = document.getElementById('si-email').value.trim().toLowerCase();
    const pass  = document.getElementById('si-pass').value;

    if (!email || !pass) { setError('Please fill in all fields.'); return; }

    const users = TF.getUsers();
    const user  = users.find(u => u.email === email && u.password === pass);

    if (!user) { setError('Incorrect email or password.'); return; }
    if (user.role !== role) {
      setError(`This account is registered as a ${user.role}. Please select the correct role.`);
      return;
    }

    // ── L7: Session persistence ─────────────────────────
    TF.setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    location.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
  }

  // ── L4 + L5: Sign Up ──────────────────────────────────
  function doSignUp() {
    clearError();
    const name    = document.getElementById('su-name').value.trim();
    const email   = document.getElementById('su-email').value.trim().toLowerCase();
    const pass    = document.getElementById('su-pass').value;
    const confirm = document.getElementById('su-confirm').value;

    if (!name || !email || !pass || !confirm) { setError('Please fill in all fields.'); return; }
    if (pass.length < 6)   { setError('Password must be at least 6 characters.'); return; }
    if (pass !== confirm)  { setError('Passwords do not match.'); return; }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) { setError('Please enter a valid email address.'); return; }

    const users = TF.getUsers();
    if (users.some(u => u.email === email)) { setError('An account with this email already exists.'); return; }

    // ── L5: new account stored → immediately assignable ─
    const newUser = { id: TF.genId(), name, email, password: pass, role };
    users.push(newUser);
    TF.saveUsers(users);

    // ── L7: set session ─────────────────────────────────
    TF.setSession({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
    location.href = role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
  }

  // ── Submit dispatcher ─────────────────────────────────
  submitBtn.addEventListener('click', () => {
    if (mode === 'signin') doSignIn();
    else doSignUp();
  });

  // Allow Enter key in inputs
  document.querySelectorAll('.auth-input').forEach(input => {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });
  });

  // ── Init ──────────────────────────────────────────────
  setMode('signin');
  setRole('student');
});