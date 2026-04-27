/*
 * PRANA Admin Dashboard Logic
 * Requires: supabase-config.js, orders-api.js loaded on the page
 */

var currentTab = 'orders';
var adminEmail = '';

// ======================== AUTH ========================

async function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value.trim();
  var btn = document.getElementById('loginBtn');
  var errorEl = document.getElementById('loginError');

  errorEl.classList.remove('show');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    var result = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) throw result.error;

    // Manually save session for cross-page persistence
    localStorage.setItem('prana_admin_session', JSON.stringify({
      access_token: result.data.session.access_token,
      refresh_token: result.data.session.refresh_token
    }));

    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message || 'Invalid credentials';
    errorEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function checkAuth() {
  // First try Supabase's built-in session
  var result = await supabaseClient.auth.getSession();
  if (result.data.session) {
    adminEmail = result.data.session.user.email;
    return true;
  }

  // Fallback: restore session from our manual storage
  var stored = localStorage.getItem('prana_admin_session');
  if (stored) {
    try {
      var tokens = JSON.parse(stored);
      var restored = await supabaseClient.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });
      if (restored.data.session) {
        adminEmail = restored.data.session.user.email;
        return true;
      }
    } catch (e) {
      console.error('Session restore failed:', e);
      localStorage.removeItem('prana_admin_session');
    }
  }

  window.location.href = 'index.html';
  return false;
}

async function logout() {
  localStorage.removeItem('prana_admin_session');
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ======================== DASHBOARD INIT ========================

async function initDashboard() {
  var authed = await checkAuth();
  if (!authed) return;

  // Show admin email
  var userEl = document.getElementById('adminEmail');
  if (userEl) userEl.textContent = adminEmail;

  await loadStats();
  await loadOrders();
  setupRealtimeSubscription();
}

// ======================== STATS ========================

async function loadStats() {
  try {
    var stats = await OrdersAPI.getOrderStats();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statProcessing').textContent = stats.processing;
    document.getElementById('statShipped').textContent = stats.shipped;
    document.getElementById('statDelivered').textContent = stats.delivered;
    document.getElementById('statCancelled').textContent = stats.cancelled;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ======================== ORDERS TABLE ========================

async function loadOrders() {
  var statusFilter = document.getElementById('filterStatus');
  var searchInput = document.getElementById('searchInput');

  var filters = {};
  if (statusFilter && statusFilter.value !== 'all') filters.status = statusFilter.value;
  if (searchInput && searchInput.value.trim()) filters.search = searchInput.value.trim();

  try {
    var orders = await OrdersAPI.getOrders(filters);
    renderOrdersTable(orders);
  } catch (err) {
    console.error('Load orders error:', err);
    showToast('Failed to load orders: ' + err.message, 'error');
  }
}

function renderOrdersTable(orders) {
  var tbody = document.getElementById('ordersBody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fa fa-inbox"></i><p>No orders found</p></td></tr>';
    return;
  }

  var html = '';
  orders.forEach(function(order) {
    var date = new Date(order.created_at);
    var dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    var timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    var itemsHtml = '';
    if (order.items && order.items.length > 0) {
      order.items.forEach(function(item) {
        itemsHtml += item.name + ' ×' + item.qty + '<br>';
      });
    }

    var statusClass = order.status.toLowerCase();

    html += '<tr>' +
      '<td><span class="order-number">' + order.order_number + '</span></td>' +
      '<td>' + dateStr + '<br><small style="color:#7a8ca0">' + timeStr + '</small></td>' +
      '<td><strong>' + order.customer_name + '</strong></td>' +
      '<td>' + order.customer_email + '</td>' +
      '<td>' + (order.customer_phone || '-') + '</td>' +
      '<td><span class="order-items-list">' + itemsHtml + '</span></td>' +
      '<td><span class="order-total">Rs ' + order.total + '</span></td>' +
      '<td>' +
        '<select class="status-select" onchange="handleStatusChange(\'' + order.id + '\', this.value, \'' + order.status + '\', ' + JSON.stringify(JSON.stringify(order)) + ')" data-order-id="' + order.id + '">' +
          buildStatusOptions(order.status) +
        '</select>' +
      '</td>' +
    '</tr>';
  });

  tbody.innerHTML = html;
}

function buildStatusOptions(current) {
  var statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  var html = '';
  statuses.forEach(function(s) {
    html += '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' + s + '</option>';
  });
  return html;
}

async function handleStatusChange(orderId, newStatus, oldStatus, orderJson) {
  if (newStatus === oldStatus) return;

  try {
    var order = JSON.parse(orderJson);

    // Update in database
    await OrdersAPI.updateOrderStatus(orderId, newStatus, oldStatus, adminEmail);
    showToast('Status updated to ' + newStatus, 'success');

    // Send email notification
    if (newStatus !== 'Pending') {
      sendStatusEmail(order, newStatus);
    }

    // Refresh data
    await loadStats();
    await loadOrders();

  } catch (err) {
    console.error('Status change error:', err);
    showToast('Failed to update status: ' + err.message, 'error');
    await loadOrders(); // Reload to revert select
  }
}

async function sendStatusEmail(order, newStatus) {
  try {
    var response = await fetch('/.netlify/functions/send-status-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        orderNumber: order.order_number,
        newStatus: newStatus,
        items: order.items
      })
    });

    var result = await response.json();
    if (result.success) {
      if (result.skipped) {
        showToast('Email skipped (API key not configured)', 'error');
      } else {
        showToast('Email sent to ' + order.customer_email, 'success');
      }
    } else {
      showToast('Email failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Email error:', err);
    showToast('Email notification failed', 'error');
  }
}

// ======================== SEARCH & FILTER ========================

var searchTimeout = null;

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() {
    loadOrders();
  }, 400);
}

function handleFilterChange() {
  loadOrders();
}

// ======================== TABS ========================

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(function(content) {
    content.classList.remove('active');
  });

  document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// ======================== USER MANAGEMENT ========================

async function addAdminUser(e) {
  e.preventDefault();
  var email = document.getElementById('newUserEmail').value.trim();
  var password = document.getElementById('newUserPassword').value.trim();
  var btn = document.getElementById('btnAddUser');

  if (!email || !password) {
    showToast('Email and password are required', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    var session = await supabaseClient.auth.getSession();
    var token = session.data.session.access_token;

    var response = await fetch('/.netlify/functions/create-admin-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ email: email, password: password })
    });

    var result = await response.json();

    if (result.success) {
      showToast('Admin user ' + email + ' created successfully', 'success');
      document.getElementById('newUserEmail').value = '';
      document.getElementById('newUserPassword').value = '';
      loadAdminUsers();
    } else {
      showToast('Failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Add user error:', err);
    showToast('Failed to create user', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Add User';
}

async function loadAdminUsers() {
  // List users from Supabase Auth is not available with anon key
  // We show a note that users are managed via dashboard or the Add User form
  var usersBody = document.getElementById('usersBody');
  if (usersBody) {
    usersBody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:#7a8ca0;">' +
      '<i class="fa fa-info-circle" style="margin-right:8px;"></i>' +
      'Admin users are managed through the form above. Check Supabase dashboard for the full user list.' +
      '</td></tr>';
  }
}

// ======================== REALTIME ========================

function setupRealtimeSubscription() {
  supabaseClient
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function(payload) {
      console.log('Realtime update:', payload);
      loadStats();
      loadOrders();
      if (payload.eventType === 'INSERT') {
        showToast('New order received: ' + (payload.new.order_number || ''), 'success');
      }
    })
    .subscribe();
}

// ======================== TOAST NOTIFICATIONS ========================

function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toastContainer');
  if (!container) return;

  var icon = type === 'error' ? '⚠️' : '✅';
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span>' +
    '<span class="toast-message">' + message + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">×</button>';

  container.appendChild(toast);

  setTimeout(function() {
    if (toast.parentElement) {
      toast.style.animation = 'fadeIn 0.3s ease reverse';
      setTimeout(function() { toast.remove(); }, 300);
    }
  }, 5000);
}
