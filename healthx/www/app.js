(() => {
  async function includeFragments() {
    const nodes = document.querySelectorAll('[data-include]');
    await Promise.all(
      Array.from(nodes).map(async (node) => {
        const path = node.getAttribute('data-include');
        if (!path) return;
        try {
          const res = await fetch(path);
          const html = await res.text();
          node.outerHTML = html;
        } catch (error) {
          console.error('Failed to include', path, error);
        }
      })
    );
  }

  function setActiveNav() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href');
      const normalized = href === '/' ? '/' : href.replace(/\/$/, '');
      if (normalized === '/') {
        link.classList.toggle('active', path === '/');
      } else {
        link.classList.toggle('active', path.startsWith(normalized));
      }
    });
  }

  function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-links');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }

  function getCsrfToken() {
    if (window.csrf_token) return window.csrf_token;
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  async function apiRequest({ method = 'GET', doctype, payload, params }) {
    const search = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          search.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });
    }

    const url = `/api/resource/${encodeURIComponent(doctype)}${search.toString() ? `?${search}` : ''}`;
    const options = {
      method,
      headers: {
        Accept: 'application/json'
      },
      credentials: 'include'
    };

    if (payload) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-Frappe-CSRF-Token'] = getCsrfToken();
      options.body = JSON.stringify(payload);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      let message = 'Something went wrong';
      try {
        const body = await res.json();
        if (body._server_messages) {
          const parsed = JSON.parse(body._server_messages)[0];
          message = JSON.parse(parsed).message || message;
        } else if (body.exc) {
          message = body.exc;
        } else if (body.message) {
          message = body.message;
        }
      } catch (_) {
        message = res.statusText;
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data;
  }

  async function fetchDocs(
    doctype,
    { fields = ['name'], filters, limit = 20, order_by = 'modified desc', start = 0 } = {}
  ) {
    const response = await fetch('/api/method/healthx.api.fetch_docs_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        doctype,
        fields,
        filters,
        order_by,
        limit,
        start
      })
    });

    const data = await safeJson(response);
    if (!response.ok) {
      throw new Error(parseFrappeError(data) || 'Failed to load records');
    }

    return data?.message || [];
  }

  async function createDoc(doctype, payload) {
    const response = await apiRequest({ method: 'POST', doctype, payload });
    return response.data;
  }

  async function getDoc(doctype, name) {
    const response = await apiRequest({
      method: 'GET',
      doctype: `${doctype}/${name}`
    });
    return response.data;
  }

  async function updateDoc(doctype, name, payload) {
    const response = await apiRequest({
      method: 'PUT',
      doctype: `${doctype}/${name}`,
      payload
    });
    return response.data;
  }

  async function deleteDoc(doctype, name) {
    const response = await apiRequest({
      method: 'DELETE',
      doctype: `${doctype}/${name}`
    });
    return response.data;
  }

  function renderTable(container, columns, rows, emptyMessage = 'No records yet') {
    if (!container) return;
    if (!rows || !rows.length) {
      container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
      return;
    }

    const head = columns.map((col) => `<th>${col.label}</th>`).join('');
    const body = rows
      .map((row) => {
        const cells = columns
          .map((col) => {
            if (col.render) {
              return `<td>${col.render(row)}</td>`;
            }
            const value = row[col.key];
            return `<td>${value ?? '—'}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    container.innerHTML = `
      <div class="table-scroll">
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  async function populateOptions(select, doctype, { labelField = 'name', limit = 100 } = {}) {
    if (!select) return;
    select.innerHTML = '<option>Loading...</option>';
    try {
      const rows = await fetchDocs(doctype, { fields: ['name', labelField], limit, order_by: 'modified desc' });
      select.innerHTML = '<option value="">Select</option>';
      rows.forEach((row) => {
        const option = document.createElement('option');
        option.value = row.name;
        option.textContent = row[labelField] || row.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error(`Failed to load options for ${doctype}`, error);
      select.innerHTML = '<option value="">Configure in desk</option>';
    }
  }

  function showToast(message, variant = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (variant === 'error') {
      toast.style.borderLeftColor = 'var(--danger)';
    }
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Authentication functions
  let sessionProfilePromise = null;

  function invalidateSessionProfile() {
    sessionProfilePromise = null;
  }

  async function getSessionProfile(force = false) {
    if (!sessionProfilePromise || force) {
      sessionProfilePromise = fetch('/api/method/healthx.api.get_session_profile', {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        credentials: 'include'
      }).then((res) => safeJson(res));
    }
    return sessionProfilePromise;
  }

  async function login(usr, pwd) {
    try {
      const response = await fetch('/api/method/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ usr, pwd, redirect_to: '/' }),
        credentials: 'include',
        redirect: 'manual'
      });

      const data = await safeJson(response);
      console.log(data);
      console.log(response);
      if (!response.ok) {
        throw new Error(parseFrappeError(data) || 'Login failed');
      }

      const isLoggedIn =
        data?.message === 'Logged In' ||
        data?.message?.message === 'Logged In' ||
        data?.message === 'Success' ||
        data?.message === 'Logged in' ||
        data?.message === 'Login Successful';

      if (isLoggedIn) {
        if (data.csrf_token) {
          window.csrf_token = data.csrf_token;
          document.cookie = `csrf_token=${data.csrf_token}; path=/`;
        }
        invalidateSessionProfile();
        // Ensure session is really active
        const profile = await getSessionProfile(true);
        const verified = profile?.is_authenticated;
        if (!verified) {
          console.warn('Login succeeded but session verification failed; forcing reload.');
        }
        return true;
      }

      throw new Error(parseFrappeError(data) || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/method/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Frappe-CSRF-Token': getCsrfToken()
        },
        credentials: 'include'
      });
      
      await response.json();
      invalidateSessionProfile();
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout error:', error);
      invalidateSessionProfile();
      // Still redirect to login even if logout fails
      window.location.href = '/login.html';
    }
  }

  async function checkAuth() {
    try {
      const profile = await getSessionProfile();
      return Boolean(profile?.is_authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async function getCurrentUser() {
    try {
      const profile = await getSessionProfile();
      return profile?.is_authenticated ? profile.user : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async function getUserRoles() {
    try {
      const profile = await getSessionProfile();
      return profile?.roles || [];
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  }

  async function hasRole(roleName) {
    const roles = await getUserRoles();
    return roles.includes(roleName);
  }

  // Global redirect interceptor to prevent redirects to /app/home
  function preventAppHomeRedirect() {
    // Check if we're currently on /app/home and redirect immediately
    if (window.location.href.includes('/app/home')) {
      window.location.replace('/');
      return;
    }
    
    // Monitor for navigation attempts using history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      const url = args[2];
      if (url && (url.includes('/app/home') || url.startsWith('/app/home'))) {
        return originalReplaceState.call(history, args[0], args[1], '/');
      }
      return originalPushState.apply(history, args);
    };
    
    history.replaceState = function(...args) {
      const url = args[2];
      if (url && (url.includes('/app/home') || url.startsWith('/app/home'))) {
        return originalReplaceState.call(history, args[0], args[1], '/');
      }
      return originalReplaceState.apply(history, args);
    };
  }

  // Check immediately on script load
  if (window.location.href.includes('/app/home')) {
    window.location.replace('/');
  }
  
  preventAppHomeRedirect();

  document.addEventListener('DOMContentLoaded', async () => {
    // Check again after DOM loads
    if (window.location.href.includes('/app/home')) {
      window.location.replace('/');
    }
    
    await includeFragments();
    setActiveNav();
    initNavToggle();
  });
  
  // Periodic check to catch any redirects that might happen (check every 500ms for first 5 seconds after page load)
  let redirectCheckCount = 0;
  const redirectCheckInterval = setInterval(() => {
    redirectCheckCount++;
    if (window.location.href.includes('/app/home')) {
      window.location.replace('/');
    }
    // Stop checking after 10 iterations (5 seconds)
    if (redirectCheckCount >= 10) {
      clearInterval(redirectCheckInterval);
    }
  }, 500);

  async function safeJson(response) {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  function parseFrappeError(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') return payload;
    if (payload.message) {
      if (typeof payload.message === 'string') return payload.message;
      if (payload.message.message) return payload.message.message;
    }
    if (payload.exc) {
      try {
        const parsed = JSON.parse(payload.exc);
        if (parsed && parsed[0]) {
          const inner = JSON.parse(parsed[0]);
          return inner?.message || inner?._error_message;
        }
      } catch (_) {
        return payload.exc;
      }
    }
    return payload._error_message || null;
  }

  window.HealthxWeb = {
    fetchDocs,
    createDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    renderTable,
    showToast,
    populateOptions,
    login,
    logout,
    checkAuth,
    getCurrentUser,
    getUserRoles,
    hasRole
  };
})();
