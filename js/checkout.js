/*
 * PRANA Checkout Page Logic
 * Requires: supabase-config.js, orders-api.js
 */

// Product catalog
var PRODUCTS = {
  juices: [
    { id: 'fiber-fuel', name: 'Fiber Fuel', subtitle: 'Gut Health & Prebiotic Juice', price: 400, image: 'images/our1.png' },
    { id: 'zen-fuel', name: 'Zen Fuel', subtitle: 'Anti-Stress Adaptogen Juice', price: 600, image: 'images/our2.png' },
    { id: 'golden-calm', name: 'Golden Calm', subtitle: 'Anti-Inflammatory Golden Elixir', price: 550, image: 'images/our3.png' },
    { id: 'liver-lift', name: 'Liver Lift', subtitle: 'Detox & Liver Support Juice', price: 600, image: 'images/our4.png' },
    { id: 'mind-fuel', name: 'Mind Fuel', subtitle: 'Brain Boost Green Juice', price: 550, image: 'images/our5.png' }
  ],
  frozenPacks: [
    { id: 'gut-health-pack', name: 'Gut Health Pack', subtitle: 'Supports digestion & gut balance', price: 300, icon: 'fa-leaf' },
    { id: 'anti-stress-pack', name: 'Anti-Stress Pack', subtitle: 'Reduces stress & improves mood', price: 500, icon: 'fa-smile-o' },
    { id: 'golden-elixir-pack', name: 'Golden Elixir Pack', subtitle: 'Anti-inflammatory & immunity', price: 450, icon: 'fa-shield' },
    { id: 'detox-pack', name: 'Detox Pack', subtitle: 'Liver function & cleansing', price: 500, icon: 'fa-refresh' },
    { id: 'brain-boost-pack', name: 'Brain Boost Pack', subtitle: 'Focus & mental clarity', price: 450, icon: 'fa-bolt' }
  ]
};

var cart = {};
var currentStep = 1;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  renderProducts();
  setupFormValidation();

  // Check for pre-selected product from URL
  var params = new URLSearchParams(window.location.search);
  var preSelect = params.get('product');
  if (preSelect) {
    cart[preSelect] = 1;
    updateProductCard(preSelect);
    updateCartSummary();
  }
});

function renderProducts() {
  var juicesGrid = document.getElementById('juicesGrid');
  var packsGrid = document.getElementById('packsGrid');

  PRODUCTS.juices.forEach(function(p) {
    juicesGrid.innerHTML += createProductCardHTML(p, true);
  });

  PRODUCTS.frozenPacks.forEach(function(p) {
    packsGrid.innerHTML += createProductCardHTML(p, false);
  });
}

function createProductCardHTML(product, hasImage) {
  var imgHTML = hasImage
    ? '<img class="product-img" src="' + product.image + '" alt="' + product.name + '">'
    : '<div class="product-icon"><i class="fa ' + product.icon + '"></i></div>';

  return '<div class="product-card" id="card-' + product.id + '" onclick="toggleProduct(\'' + product.id + '\')">' +
    imgHTML +
    '<div class="product-name">' + product.name + '</div>' +
    '<div class="product-subtitle">' + product.subtitle + '</div>' +
    '<div class="product-price">Rs ' + product.price + '</div>' +
    '<div class="qty-controls" onclick="event.stopPropagation()">' +
      '<button class="qty-btn" onclick="changeQty(\'' + product.id + '\', -1)">−</button>' +
      '<span class="qty-value" id="qty-' + product.id + '">0</span>' +
      '<button class="qty-btn" onclick="changeQty(\'' + product.id + '\', 1)">+</button>' +
    '</div>' +
  '</div>';
}

function toggleProduct(id) {
  if (cart[id] && cart[id] > 0) {
    delete cart[id];
  } else {
    cart[id] = 1;
  }
  updateProductCard(id);
  updateCartSummary();
}

function changeQty(id, delta) {
  var current = cart[id] || 0;
  var newQty = Math.max(0, current + delta);

  if (newQty === 0) {
    delete cart[id];
  } else {
    cart[id] = newQty;
  }

  updateProductCard(id);
  updateCartSummary();
}

function updateProductCard(id) {
  var card = document.getElementById('card-' + id);
  var qtyEl = document.getElementById('qty-' + id);
  var qty = cart[id] || 0;

  if (card) {
    if (qty > 0) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }
  if (qtyEl) qtyEl.textContent = qty;
}

function updateCartSummary() {
  var totalItems = 0;
  var totalPrice = 0;

  Object.keys(cart).forEach(function(id) {
    var product = findProduct(id);
    if (product) {
      totalItems += cart[id];
      totalPrice += product.price * cart[id];
    }
  });

  var itemsEl = document.getElementById('cartItems');
  var totalEl = document.getElementById('cartTotal');
  var btnEl = document.getElementById('btnStep1Next');

  if (itemsEl) itemsEl.textContent = totalItems + ' item' + (totalItems !== 1 ? 's' : '');
  if (totalEl) totalEl.textContent = 'Rs ' + totalPrice;
  if (btnEl) btnEl.disabled = totalItems === 0;
}

function findProduct(id) {
  var all = PRODUCTS.juices.concat(PRODUCTS.frozenPacks);
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

// Step navigation
function goToStep(step) {
  if (step === 2 && Object.keys(cart).length === 0) return;
  if (step === 3 && !validateForm()) return;

  currentStep = step;

  // Update sections
  document.querySelectorAll('.checkout-section').forEach(function(el) {
    el.classList.remove('active');
  });
  document.getElementById('step' + step).classList.add('active');

  // Update step indicator
  for (var i = 1; i <= 3; i++) {
    var circle = document.getElementById('stepCircle' + i);
    var label = document.getElementById('stepLabel' + i);
    var line = document.getElementById('stepLine' + i);

    circle.classList.remove('active', 'completed');
    if (label) label.classList.remove('active', 'completed');
    if (line) line.classList.remove('completed');

    if (i === step) {
      circle.classList.add('active');
      if (label) label.classList.add('active');
    } else if (i < step) {
      circle.classList.add('completed');
      circle.innerHTML = '✓';
      if (label) label.classList.add('completed');
      if (line) line.classList.add('completed');
    } else {
      circle.innerHTML = i;
    }
  }

  // Build order summary on step 3
  if (step === 3) buildOrderSummary();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateForm() {
  var valid = true;
  var fields = [
    { id: 'customerName', min: 2 },
    { id: 'customerEmail', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { id: 'customerPhone', min: 7 }
  ];

  fields.forEach(function(f) {
    var input = document.getElementById(f.id);
    var group = input.closest('.form-group');
    var val = input.value.trim();

    group.classList.remove('has-error');

    if (!val || (f.min && val.length < f.min) || (f.pattern && !f.pattern.test(val))) {
      group.classList.add('has-error');
      valid = false;
    }
  });

  return valid;
}

function setupFormValidation() {
  ['customerName', 'customerEmail', 'customerPhone'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        this.closest('.form-group').classList.remove('has-error');
      });
    }
  });
}

function buildOrderSummary() {
  var summaryItems = document.getElementById('summaryItems');
  var summaryTotal = document.getElementById('summaryTotalPrice');
  var summaryCustomer = document.getElementById('summaryCustomer');

  var html = '';
  var total = 0;

  Object.keys(cart).forEach(function(id) {
    var product = findProduct(id);
    if (product) {
      var lineTotal = product.price * cart[id];
      total += lineTotal;
      html += '<div class="summary-item">' +
        '<div><span class="summary-item-name">' + product.name + '</span> ' +
        '<span class="summary-item-qty">× ' + cart[id] + '</span></div>' +
        '<span class="summary-item-price">Rs ' + lineTotal + '</span>' +
      '</div>';
    }
  });

  if (summaryItems) summaryItems.innerHTML = html;
  if (summaryTotal) summaryTotal.textContent = 'Rs ' + total;

  if (summaryCustomer) {
    var name = document.getElementById('customerName').value;
    var email = document.getElementById('customerEmail').value;
    var phone = document.getElementById('customerPhone').value;
    var address = document.getElementById('customerAddress').value;

    summaryCustomer.innerHTML = '<h4>Delivery Details</h4>' +
      '<p><strong>' + name + '</strong><br>' +
      email + '<br>' +
      phone +
      (address ? '<br>' + address : '') +
      '</p>';
  }
}

async function placeOrder() {
  var btn = document.getElementById('btnPlaceOrder');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Placing Order...';

  try {
    var items = [];
    var total = 0;

    Object.keys(cart).forEach(function(id) {
      var product = findProduct(id);
      if (product) {
        items.push({
          id: product.id,
          name: product.name,
          qty: cart[id],
          price: product.price
        });
        total += product.price * cart[id];
      }
    });

    var orderData = {
      customerName: document.getElementById('customerName').value.trim(),
      customerEmail: document.getElementById('customerEmail').value.trim(),
      customerPhone: document.getElementById('customerPhone').value.trim(),
      customerAddress: document.getElementById('customerAddress').value.trim(),
      items: items,
      total: total
    };

    var order = await OrdersAPI.createOrder(orderData);

    // Show success
    document.getElementById('successOrderNumber').textContent = order.order_number;
    document.querySelectorAll('.checkout-section').forEach(function(el) {
      el.classList.remove('active');
    });
    document.getElementById('stepSuccess').classList.add('active');

    // Hide step indicator
    document.querySelector('.step-indicator').style.display = 'none';

  } catch (err) {
    console.error('Order error:', err);
    alert('Failed to place order. Please try again.\n\n' + (err.message || ''));
    btn.disabled = false;
    btn.innerHTML = 'Place Order';
  }
}
