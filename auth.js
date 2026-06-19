/* ============================================
   TRAPICAMPO — Authentication & Authorization
   Register · Login · Sessions · Roles · Users
   ============================================ */

// ══════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════

const AUTH_STORAGE_KEY = 'trapicampo_users';
const SESSION_STORAGE_KEY = 'trapicampo_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

// ══════════════════════════════════
//  PASSWORD HASHING (SHA-256)
// ══════════════════════════════════

async function hashPassword(password) {
  const encoder = new TextEncoder();
  // Add a static salt for extra security
  const salted = 'trapicampo_salt_2026::' + password;
  const data = encoder.encode(salted);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ══════════════════════════════════
//  USER DATABASE (localStorage)
// ══════════════════════════════════

function getUsers() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

function findUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  return getUsers().find(u => u.id === id);
}

function generateUserId() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ══════════════════════════════════
//  DEFAULT ADMIN SEEDING
// ══════════════════════════════════

async function initDefaultAdmin() {
  const users = getUsers();
  const adminExists = users.some(u => u.email === 'admin@admin.com');

  if (!adminExists) {
    const passwordHash = await hashPassword('Admin123*');
    const adminUser = {
      id: 'admin001',
      fullName: 'Administrador',
      email: 'admin@admin.com',
      passwordHash,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(adminUser);
    saveUsers(users);
  }
}

// ══════════════════════════════════
//  VALIDATION HELPERS
// ══════════════════════════════════

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una letra mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Al menos un carácter especial (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', label: 'Débil', percent: 25, color: '#ef4444' };
  if (score <= 4) return { level: 'medium', label: 'Media', percent: 50, color: '#f59e0b' };
  if (score <= 5) return { level: 'strong', label: 'Fuerte', percent: 75, color: '#22c55e' };
  return { level: 'very-strong', label: 'Muy fuerte', percent: 100, color: '#15803d' };
}

// ══════════════════════════════════
//  REGISTRATION
// ══════════════════════════════════

async function registerUser(fullName, email, password, confirmPassword) {
  const errors = {};

  // Validate full name
  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = 'El nombre debe tener al menos 2 caracteres';
  }

  // Validate email format
  if (!email || !email.trim()) {
    errors.email = 'El correo electrónico es obligatorio';
  } else if (!validateEmail(email.trim())) {
    errors.email = 'El formato del correo electrónico no es válido';
  } else if (findUserByEmail(email.trim())) {
    errors.email = 'Este correo electrónico ya está registrado';
  }

  // Validate password
  if (!password) {
    errors.password = 'La contraseña es obligatoria';
  } else {
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      errors.password = pwdValidation.errors.join(', ');
    }
  }

  // Validate confirm password
  if (!confirmPassword) {
    errors.confirmPassword = 'Debes confirmar la contraseña';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const newUser = {
    id: generateUserId(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: ROLES.USER,
    status: USER_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const users = getUsers();
  users.push(newUser);
  saveUsers(users);

  return { success: true, user: newUser };
}

// ══════════════════════════════════
//  LOGIN
// ══════════════════════════════════

async function loginUser(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Correo y contraseña son obligatorios' };
  }

  const user = findUserByEmail(email.trim());

  if (!user) {
    return { success: false, error: 'Correo electrónico o contraseña incorrectos' };
  }

  if (user.status === USER_STATUS.INACTIVE) {
    return { success: false, error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' };
  }

  const passwordHash = await hashPassword(password);

  if (user.passwordHash !== passwordHash) {
    return { success: false, error: 'Correo electrónico o contraseña incorrectos' };
  }

  // Create session
  createSession(user);

  return { success: true, user };
}

// ══════════════════════════════════
//  SESSION MANAGEMENT
// ══════════════════════════════════

function createSession(user) {
  const session = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  };
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getCurrentSession() {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;

  const session = JSON.parse(stored);

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }

  return session;
}

function refreshSession() {
  const session = getCurrentSession();
  if (session) {
    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

function isLoggedIn() {
  return getCurrentSession() !== null;
}

function isAdmin() {
  const session = getCurrentSession();
  return session && session.role === ROLES.ADMIN;
}

function logout() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  window.location.href = 'login.html';
}

// ══════════════════════════════════
//  ROUTE PROTECTION
// ══════════════════════════════════

function requireAuth(requiredRole = null) {
  const session = getCurrentSession();

  if (!session) {
    window.location.href = 'login.html';
    return false;
  }

  if (requiredRole && session.role !== requiredRole) {
    window.location.href = 'index.html';
    return false;
  }

  return true;
}

function requireAdmin() {
  return requireAuth(ROLES.ADMIN);
}

// ══════════════════════════════════
//  USER MANAGEMENT (Admin)
// ══════════════════════════════════

async function createUserByAdmin(fullName, email, password, role) {
  const errors = {};

  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = 'El nombre debe tener al menos 2 caracteres';
  }

  if (!email || !validateEmail(email.trim())) {
    errors.email = 'Correo electrónico inválido';
  } else if (findUserByEmail(email.trim())) {
    errors.email = 'Este correo ya está registrado';
  }

  if (!password || password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }

  if (!role || ![ROLES.ADMIN, ROLES.USER].includes(role)) {
    errors.role = 'Rol inválido';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: generateUserId(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role,
    status: USER_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const users = getUsers();
  users.push(newUser);
  saveUsers(users);

  return { success: true, user: newUser };
}

async function updateUserByAdmin(userId, data) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

  const user = users[idx];

  // Check email uniqueness if email is being changed
  if (data.email && data.email.toLowerCase() !== user.email) {
    if (findUserByEmail(data.email)) {
      return { success: false, errors: { email: 'Este correo ya está registrado' } };
    }
  }

  // Update fields
  if (data.fullName) user.fullName = data.fullName.trim();
  if (data.email) user.email = data.email.trim().toLowerCase();
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;
  if (data.password && data.password.trim()) {
    user.passwordHash = await hashPassword(data.password);
  }
  user.updatedAt = new Date().toISOString();

  users[idx] = user;
  saveUsers(users);

  return { success: true, user };
}

function deleteUserById(userId) {
  const session = getCurrentSession();

  // Prevent deleting yourself
  if (session && session.userId === userId) {
    return { success: false, error: 'No puedes eliminar tu propia cuenta' };
  }

  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const filtered = users.filter(u => u.id !== userId);
  saveUsers(filtered);

  return { success: true };
}

function toggleUserStatus(userId) {
  const session = getCurrentSession();

  // Prevent blocking yourself
  if (session && session.userId === userId) {
    return { success: false, error: 'No puedes desactivar tu propia cuenta' };
  }

  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuario no encontrado' };

  users[idx].status = users[idx].status === USER_STATUS.ACTIVE
    ? USER_STATUS.INACTIVE
    : USER_STATUS.ACTIVE;
  users[idx].updatedAt = new Date().toISOString();

  saveUsers(users);

  return { success: true, newStatus: users[idx].status };
}

// ══════════════════════════════════
//  NAVBAR AUTH UI
// ══════════════════════════════════

function renderAuthNavbar() {
  const actionsContainer = document.querySelector('.navbar__actions');
  if (!actionsContainer) return;

  const session = getCurrentSession();

  // Find existing auth elements to replace
  const existingAuthBtns = actionsContainer.querySelectorAll('.auth-nav-btn, .auth-nav-user');
  existingAuthBtns.forEach(el => el.remove());

  // Remove the old static admin link if exists
  const oldAdminLink = actionsContainer.querySelector('a[href="admin.html"]');
  if (oldAdminLink) oldAdminLink.remove();

  if (session) {
    // Build logged-in UI
    const userInfo = document.createElement('div');
    userInfo.className = 'auth-nav-user';
    userInfo.innerHTML = `
      <div class="auth-nav-avatar">${session.fullName.charAt(0).toUpperCase()}</div>
      <span class="auth-nav-name">${session.fullName.split(' ')[0]}</span>
      <div class="auth-nav-dropdown">
        ${session.role === ROLES.ADMIN ? `
          <a href="admin.html" class="auth-nav-dropdown__item">
            <span>⚙️</span> Panel Admin
          </a>
        ` : ''}
        <button class="auth-nav-dropdown__item auth-nav-dropdown__item--logout" onclick="logout()">
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    `;

    // Toggle dropdown on click
    userInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      userInfo.classList.toggle('open');
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      userInfo.classList.remove('open');
    });

    // Insert before cart button
    const cartBtn = actionsContainer.querySelector('.navbar__btn--cart');
    if (cartBtn) {
      actionsContainer.insertBefore(userInfo, cartBtn);
    } else {
      actionsContainer.appendChild(userInfo);
    }
  } else {
    // Build logged-out UI
    const loginBtn = document.createElement('a');
    loginBtn.href = 'login.html';
    loginBtn.className = 'navbar__btn auth-nav-btn';
    loginBtn.innerHTML = '👤 <span>Ingresar</span>';

    const registerBtn = document.createElement('a');
    registerBtn.href = 'register.html';
    registerBtn.className = 'navbar__btn navbar__btn--register auth-nav-btn';
    registerBtn.innerHTML = '✨ <span>Registrarse</span>';

    const cartBtn = actionsContainer.querySelector('.navbar__btn--cart');
    if (cartBtn) {
      actionsContainer.insertBefore(registerBtn, cartBtn);
      actionsContainer.insertBefore(loginBtn, registerBtn);
    } else {
      actionsContainer.appendChild(loginBtn);
      actionsContainer.appendChild(registerBtn);
    }
  }
}

// ══════════════════════════════════
//  SESSION ACTIVITY TRACKER
// ══════════════════════════════════

function setupSessionTracker() {
  if (!isLoggedIn()) return;

  // Refresh session on user activity
  const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  let lastRefresh = Date.now();

  events.forEach(event => {
    document.addEventListener(event, () => {
      // Only refresh every 60 seconds to avoid excessive writes
      if (Date.now() - lastRefresh > 60000) {
        refreshSession();
        lastRefresh = Date.now();
      }
    }, { passive: true });
  });

  // Check session expiration periodically
  setInterval(() => {
    if (!getCurrentSession()) {
      // Session expired
      window.location.href = 'login.html';
    }
  }, 60000); // check every minute
}

// ══════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  await initDefaultAdmin();

  // Setup auth navbar on client page
  if (document.getElementById('productsGrid')) {
    renderAuthNavbar();
  }

  // Setup session tracking
  setupSessionTracker();
});
