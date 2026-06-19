/* ============================================
   TRAPICAMPO — Application Logic
   Inventory · Cart · Checkout · Orders · Admin
   ============================================ */

// ══════════════════════════════════
//  DATA: Default Products
// ══════════════════════════════════

const DEFAULT_PRODUCTS = [
  {
    id: 'p001',
    name: 'Manzanas Rojas',
    category: 'frutas',
    emoji: '🍎',
    price: 4500,
    stock: 45,
    unit: '1 kg',
    organic: true
  },
  {
    id: 'p002',
    name: 'Bananos Criollos',
    category: 'frutas',
    emoji: '🍌',
    price: 2800,
    stock: 60,
    unit: '1 kg',
    organic: true
  },
  {
    id: 'p003',
    name: 'Aguacates Hass',
    category: 'frutas',
    emoji: '🥑',
    price: 6200,
    stock: 3,
    unit: '1 kg',
    organic: true
  },
  {
    id: 'p004',
    name: 'Leche Entera',
    category: 'lacteos',
    emoji: '🥛',
    price: 4200,
    stock: 30,
    unit: '1 L',
    organic: false
  },
  {
    id: 'p005',
    name: 'Queso Campesino',
    category: 'lacteos',
    emoji: '🧀',
    price: 8500,
    stock: 15,
    unit: '500 g',
    organic: true
  },
  {
    id: 'p006',
    name: 'Huevos de Campo',
    category: 'lacteos',
    emoji: '🥚',
    price: 12000,
    stock: 4,
    unit: '30 unidades',
    organic: true
  },
  {
    id: 'p007',
    name: 'Arroz Diana',
    category: 'abarrotes',
    emoji: '🍚',
    price: 5800,
    stock: 50,
    unit: '1 kg',
    organic: false
  },
  {
    id: 'p008',
    name: 'Frijoles Rojos',
    category: 'abarrotes',
    emoji: '🫘',
    price: 4900,
    stock: 35,
    unit: '500 g',
    organic: false
  },
  {
    id: 'p009',
    name: 'Aceite de Girasol',
    category: 'abarrotes',
    emoji: '🫒',
    price: 9500,
    stock: 20,
    unit: '1 L',
    organic: false
  },
  {
    id: 'p010',
    name: 'Jugo de Naranja',
    category: 'bebidas',
    emoji: '🍊',
    price: 5500,
    stock: 25,
    unit: '1 L',
    organic: true
  },
  {
    id: 'p011',
    name: 'Pechuga de Pollo',
    category: 'carnes',
    emoji: '🍗',
    price: 14500,
    stock: 2,
    unit: '1 kg',
    organic: false
  },
  {
    id: 'p012',
    name: 'Tomates Maduros',
    category: 'verduras',
    emoji: '🍅',
    price: 3200,
    stock: 40,
    unit: '1 kg',
    organic: true
  },
  {
    id: 'p013',
    name: 'Cebolla Cabezona',
    category: 'verduras',
    emoji: '🧅',
    price: 2500,
    stock: 55,
    unit: '1 kg',
    organic: false
  },
  {
    id: 'p014',
    name: 'Yogurt Natural',
    category: 'lacteos',
    emoji: '🫙',
    price: 6800,
    stock: 18,
    unit: '1 L',
    organic: true
  },
  {
    id: 'p015',
    name: 'Agua Mineral',
    category: 'bebidas',
    emoji: '💧',
    price: 1800,
    stock: 80,
    unit: '600 ml',
    organic: false
  },
  {
    id: 'p016',
    name: 'Pan Integral',
    category: 'abarrotes',
    emoji: '🍞',
    price: 5200,
    stock: 12,
    unit: '500 g',
    organic: true
  }
];

const SHIPPING_COST = 2500;
const LOW_STOCK_THRESHOLD = 5;

// ══════════════════════════════════
//  INDEXED DB FOR IMAGES
// ══════════════════════════════════

let productImagesCache = {};

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('trapicampo_db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('product_images')) {
        db.createObjectStore('product_images', { keyPath: 'productId' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function loadAllImagesToCache() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('product_images', 'readonly');
      const store = tx.objectStore('product_images');
      const req = store.getAll();
      req.onsuccess = () => {
        productImagesCache = {};
        req.result.forEach(item => {
          productImagesCache[item.productId] = item.images || [];
        });
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('IndexedDB init error:', err);
  }
}

async function saveImagesToDB(productId, images) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_images', 'readwrite');
    const store = tx.objectStore('product_images');
    store.put({ productId, images });
    tx.oncomplete = () => {
      productImagesCache[productId] = images;
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteImagesFromDB(productId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('product_images', 'readwrite');
    const store = tx.objectStore('product_images');
    store.delete(productId);
    tx.oncomplete = () => {
      delete productImagesCache[productId];
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ══════════════════════════════════
//  STORAGE HELPERS
// ══════════════════════════════════

function getProducts() {
  const stored = localStorage.getItem('trapicampo_products');
  if (stored) {
    return JSON.parse(stored);
  }
  // First time: seed defaults
  localStorage.setItem('trapicampo_products', JSON.stringify(DEFAULT_PRODUCTS));
  return [...DEFAULT_PRODUCTS];
}

function saveProducts(products) {
  localStorage.setItem('trapicampo_products', JSON.stringify(products));
}

function getCart() {
  const stored = localStorage.getItem('trapicampo_cart');
  return stored ? JSON.parse(stored) : [];
}

function saveCart(cart) {
  localStorage.setItem('trapicampo_cart', JSON.stringify(cart));
}

function getOrders() {
  const stored = localStorage.getItem('trapicampo_orders');
  return stored ? JSON.parse(stored) : [];
}

function saveOrders(orders) {
  localStorage.setItem('trapicampo_orders', JSON.stringify(orders));
}

// ══════════════════════════════════
//  FORMAT HELPERS
// ══════════════════════════════════

function formatPrice(n) {
  return '$' + n.toLocaleString('es-CO');
}

function generateId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function generateOrderId() {
  return 'TC-' + Date.now().toString(36).toUpperCase().slice(-5);
}

function getCategoryLabel(cat) {
  const labels = {
    frutas: '🍎 Frutas',
    verduras: '🥬 Verduras',
    lacteos: '🥛 Lácteos',
    abarrotes: '🛒 Abarrotes',
    bebidas: '🧃 Bebidas',
    carnes: '🥩 Carnes'
  };
  return labels[cat] || cat;
}

function getCategoryName(cat) {
  const labels = {
    frutas: 'Frutas',
    verduras: 'Verduras',
    lacteos: 'Lácteos',
    abarrotes: 'Abarrotes',
    bebidas: 'Bebidas',
    carnes: 'Carnes'
  };
  return labels[cat] || cat;
}

// ══════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════

function showToast(msg, type = 'success', containerId = 'toast') {
  const toast = document.getElementById(containerId);
  if (!toast) return;
  const iconEl = toast.querySelector('.toast__icon') || document.getElementById(containerId + 'Icon');
  const msgEl = toast.querySelector('#' + containerId.replace('toast','toast') + 'Msg') || toast.lastElementChild;

  // Find elements more robustly
  const icon = toast.children[0];
  const message = toast.children[1];

  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const classes = { success: 'toast--success', error: 'toast--error', warning: 'toast--warning' };

  toast.className = 'toast ' + (classes[type] || 'toast--success');

  if (icon) icon.textContent = icons[type] || '✅';
  if (message) message.textContent = msg;

  toast.classList.add('active');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// ══════════════════════════════════
//  CLIENT SIDE: CATALOG & CART
// ══════════════════════════════════

let currentCategory = 'todos';
let searchQuery = '';

function isClientPage() {
  return document.getElementById('productsGrid') !== null;
}

function isAdminPage() {
  return document.getElementById('inventoryTable') !== null;
}

// ── Render Product Grid ──
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const countEl = document.getElementById('productCount');
  if (!grid) return;

  const products = getProducts();
  let filtered = products;

  // Category filter
  if (currentCategory !== 'todos') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  if (countEl) {
    countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--gray-400);">
        <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
        <p style="font-size: 1.1rem; font-weight: 500;">No se encontraron productos</p>
        <p style="font-size: 0.9rem; margin-top: 4px;">Intenta con otra búsqueda o categoría</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    const isLow = p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0;
    const isOut = p.stock === 0;

    const images = productImagesCache[p.id] || [];
    const imageHtml = images.length > 0 
      ? `<div class="product-card__image-container"><img src="${images[0]}" alt="${p.name}"></div>` 
      : '';

    return `
      <article class="product-card fade-in-up delay-${(i % 6) + 1}" data-product-id="${p.id}" onclick="openProductDetail('${p.id}')" style="cursor: pointer;">
        <div class="product-card__image">
          ${imageHtml}
          <span class="product-card__image-emoji" style="${images.length > 0 ? 'display:none;' : ''}">${p.emoji}</span>
          ${p.organic ? '<span class="product-card__badge product-card__badge--organic">Orgánico</span>' : ''}
          ${isLow ? '<span class="product-card__badge product-card__badge--low">¡Pocas unidades!</span>' : ''}
        </div>
        <div class="product-card__body">
          <span class="product-card__category">${getCategoryName(p.category)}</span>
          <h3 class="product-card__name">${p.name}</h3>
          <span class="product-card__unit">${p.unit}</span>
          <div class="product-card__footer">
            <div>
              <div class="product-card__price">${formatPrice(p.price)}</div>
              <span class="product-card__stock ${isLow || isOut ? 'product-card__stock--low' : ''}">
                ${isOut ? 'Agotado' : `${p.stock} disponibles`}
              </span>
            </div>
            <button class="btn-add-cart" 
                    onclick="event.stopPropagation(); addToCart('${p.id}')" 
                    ${isOut ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}
                    aria-label="Agregar ${p.name} al carrito"
                    title="Agregar al carrito">
              +
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Category Filter ──
function setupCategories() {
  const list = document.getElementById('categoriesList');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;

    list.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.category;
    renderProducts();
  });
}

// ── Search ──
function setupSearch() {
  const desktopInput = document.getElementById('searchInput');
  const mobileInput = document.getElementById('mobileSearchInput');
  const btnMobile = document.getElementById('btnMobileSearch');
  const mobileBar = document.getElementById('mobileSearch');

  function handleSearch(e) {
    searchQuery = e.target.value;
    // Sync both inputs
    if (desktopInput && desktopInput !== e.target) desktopInput.value = searchQuery;
    if (mobileInput && mobileInput !== e.target) mobileInput.value = searchQuery;
    renderProducts();
  }

  if (desktopInput) desktopInput.addEventListener('input', handleSearch);
  if (mobileInput) mobileInput.addEventListener('input', handleSearch);

  if (btnMobile && mobileBar) {
    btnMobile.addEventListener('click', () => {
      mobileBar.classList.toggle('active');
      if (mobileBar.classList.contains('active')) {
        mobileInput.focus();
      }
    });
  }
}

// ── Product Detail Modal ──
let currentDetailProduct = null;

window.openProductDetail = function(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentDetailProduct = product;
  
  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailCategory').textContent = getCategoryName(product.category);
  document.getElementById('detailPrice').textContent = formatPrice(product.price);
  document.getElementById('detailUnit').textContent = product.unit;
  
  const badgesContainer = document.getElementById('detailBadges');
  badgesContainer.innerHTML = '';
  if (product.organic) {
    badgesContainer.innerHTML += '<span class="product-card__badge product-card__badge--organic" style="position:static;">Orgánico</span>';
  }
  const isLow = product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0;
  if (isLow) {
    badgesContainer.innerHTML += '<span class="product-card__badge product-card__badge--low" style="position:static;">¡Pocas unidades!</span>';
  }
  if (product.stock === 0) {
    badgesContainer.innerHTML += '<span class="product-card__badge product-card__badge--low" style="position:static; background:var(--danger); color:white;">Agotado</span>';
  }
  
  const btnAdd = document.getElementById('btnDetailAddToCart');
  if (product.stock === 0) {
    btnAdd.disabled = true;
    btnAdd.style.opacity = '0.4';
    btnAdd.style.cursor = 'not-allowed';
    btnAdd.innerHTML = 'Agotado';
  } else {
    btnAdd.disabled = false;
    btnAdd.style.opacity = '1';
    btnAdd.style.cursor = 'pointer';
    btnAdd.innerHTML = '🛒 Agregar al Carrito';
    btnAdd.onclick = () => {
      addToCart(product.id);
      closeProductDetail();
    };
  }

  renderDetailGallery(0);

  document.getElementById('productDetailModal').classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.renderDetailGallery = function(activeIndex) {
  const product = currentDetailProduct;
  if (!product) return;

  const images = productImagesCache[product.id] || [];
  const mainContainer = document.getElementById('detailMainImageContainer');
  const thumbsContainer = document.getElementById('detailThumbnails');

  if (images.length === 0) {
    mainContainer.innerHTML = `<div style="font-size: 8rem; text-shadow: 0 10px 20px rgba(0,0,0,0.1);">${product.emoji}</div>`;
    thumbsContainer.style.display = 'none';
  } else {
    mainContainer.innerHTML = `<img src="${images[activeIndex]}" alt="${product.name}">`;
    thumbsContainer.style.display = images.length > 1 ? 'flex' : 'none';
    thumbsContainer.innerHTML = images.map((src, idx) => `
      <div class="product-detail-thumb ${idx === activeIndex ? 'active' : ''}" onclick="renderDetailGallery(${idx})">
        <img src="${src}" alt="Miniatura">
      </div>
    `).join('');
  }
};

window.closeProductDetail = function() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  currentDetailProduct = null;
};

function setupProductDetail() {
  const btnClose = document.getElementById('btnCloseProductDetail');
  const modal = document.getElementById('productDetailModal');
  
  if (btnClose) btnClose.addEventListener('click', closeProductDetail);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProductDetail();
    });
  }
}

// ── Cart Operations ──
function addToCart(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const cart = getCart();
  const existing = cart.find(c => c.productId === productId);

  if (existing) {
    if (existing.qty >= product.stock) {
      showToast('No hay más stock disponible', 'warning');
      return;
    }
    existing.qty++;
  } else {
    cart.push({ productId, qty: 1 });
  }

  // Decrease stock
  product.stock--;
  saveProducts(products);
  saveCart(cart);

  // Visual feedback on button
  const card = document.querySelector(`[data-product-id="${productId}"]`);
  if (card) {
    const btn = card.querySelector('.btn-add-cart');
    if (btn) {
      btn.classList.add('added');
      setTimeout(() => btn.classList.remove('added'), 400);
    }
  }

  renderProducts();
  renderCart();
  updateCartBadge();
  showToast(`${product.name} agregado al carrito`);
}

function removeFromCart(productId) {
  const cart = getCart();
  const item = cart.find(c => c.productId === productId);
  if (!item) return;

  // Restore stock
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (product) {
    product.stock += item.qty;
    saveProducts(products);
  }

  const newCart = cart.filter(c => c.productId !== productId);
  saveCart(newCart);
  renderCart();
  renderProducts();
  updateCartBadge();
}

function updateCartQty(productId, delta) {
  const cart = getCart();
  const item = cart.find(c => c.productId === productId);
  if (!item) return;

  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (delta > 0 && product.stock <= 0) {
    showToast('No hay más stock disponible', 'warning');
    return;
  }

  item.qty += delta;
  product.stock -= delta;

  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }

  saveProducts(products);
  saveCart(cart);
  renderCart();
  renderProducts();
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const cart = getCart();
  const total = cart.reduce((sum, c) => sum + c.qty, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function getCartTotal() {
  const cart = getCart();
  const products = getProducts();
  let subtotal = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      subtotal += product.price * item.qty;
    }
  });

  return { subtotal, shipping: SHIPPING_COST, total: subtotal + SHIPPING_COST };
}

// ── Render Cart Drawer ──
function renderCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!container) return;

  const cart = getCart();
  const products = getProducts();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p class="cart-empty__text">Tu carrito está vacío</p>
        <p style="font-size: 0.85rem; color: var(--gray-400); margin-top: 8px;">Agrega productos del catálogo</p>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  container.innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return '';
    return `
      <div class="cart-item">
        <div class="cart-item__image">${product.emoji}</div>
        <div class="cart-item__info">
          <div class="cart-item__name">${product.name}</div>
          <div class="cart-item__price">${formatPrice(product.price)} × ${item.qty} = ${formatPrice(product.price * item.qty)}</div>
        </div>
        <div class="cart-item__qty">
          <button onclick="updateCartQty('${item.productId}', -1)" aria-label="Quitar uno">−</button>
          <span>${item.qty}</span>
          <button onclick="updateCartQty('${item.productId}', 1)" aria-label="Agregar uno">+</button>
        </div>
        <button class="cart-item__remove" onclick="removeFromCart('${item.productId}')" aria-label="Eliminar del carrito">🗑️</button>
      </div>
    `;
  }).join('');

  // Update totals
  const totals = getCartTotal();
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const totalEl = document.getElementById('cartTotal');

  if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
  if (shippingEl) shippingEl.textContent = formatPrice(totals.shipping);
  if (totalEl) totalEl.textContent = formatPrice(totals.total);

  if (footer) footer.style.display = 'block';
}

// ── Cart Drawer Toggle ──
function setupCartDrawer() {
  const btnOpen = document.getElementById('btnOpenCart');
  const btnClose = document.getElementById('btnCloseCart');
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');

  function openCart() {
    if (overlay) overlay.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (overlay) overlay.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (btnOpen) btnOpen.addEventListener('click', openCart);
  if (btnClose) btnClose.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);
}

// ── Checkout ──
function setupCheckout() {
  const btnCheckout = document.getElementById('btnCheckout');
  const modal = document.getElementById('checkoutModal');
  const btnClose = document.getElementById('btnCloseCheckout');
  const form = document.getElementById('checkoutForm');

  function openCheckout() {
    // Close cart drawer
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.getElementById('cartDrawer')?.classList.remove('active');
    document.body.style.overflow = 'hidden';

    // Populate summary
    const cart = getCart();
    const products = getProducts();
    const totals = getCartTotal();

    const summaryItems = document.getElementById('checkoutSummaryItems');
    const summaryTotal = document.getElementById('checkoutTotal');
    const modalTitle = document.getElementById('checkoutModalTitle');
    const modalBody = document.getElementById('checkoutModalBody');

    // Reset to form view
    if (modalTitle) modalTitle.textContent = '📦 Datos de Entrega';
    if (form) form.style.display = '';
    const summaryContainer = document.getElementById('checkoutSummary');
    if (summaryContainer) summaryContainer.style.display = '';

    // Remove any success view
    const successView = document.getElementById('orderSuccessView');
    if (successView) successView.remove();

    if (summaryItems) {
      summaryItems.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        return `
          <div class="order-summary__item">
            <span>${product.emoji} ${product.name} × ${item.qty}</span>
            <span>${formatPrice(product.price * item.qty)}</span>
          </div>
        `;
      }).join('');
    }

    if (summaryTotal) summaryTotal.textContent = formatPrice(totals.total);

    // Set min date to today
    const dateInput = document.getElementById('deliveryDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      dateInput.value = today;
    }

    modal?.classList.add('active');
  }

  function closeCheckout() {
    modal?.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (btnCheckout) btnCheckout.addEventListener('click', openCheckout);
  if (btnClose) btnClose.addEventListener('click', closeCheckout);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCheckout();
    });
  }

  // Payment method selection
  const paymentOptions = document.getElementById('paymentOptions');
  if (paymentOptions) {
    paymentOptions.addEventListener('click', (e) => {
      const card = e.target.closest('.payment-card');
      if (!card) return;
      paymentOptions.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitOrder();
    });
  }
}

function submitOrder() {
  const cart = getCart();
  const products = getProducts();
  const totals = getCartTotal();

  if (cart.length === 0) return;

  // Gather form data
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const date = document.getElementById('deliveryDate').value;
  const time = document.getElementById('deliveryTime').value;
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'efectivo';
  const notes = document.getElementById('orderNotes').value.trim();

  if (!name || !phone || !address || !date || !time) {
    showToast('Por favor completa todos los campos obligatorios', 'error');
    return;
  }

  // Build order object
  const order = {
    id: generateOrderId(),
    date: new Date().toISOString(),
    customer: { name, phone, address },
    delivery: { date, time },
    paymentMethod,
    notes,
    items: cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: product ? product.name : 'Producto',
        emoji: product ? product.emoji : '📦',
        price: product ? product.price : 0,
        qty: item.qty,
        subtotal: product ? product.price * item.qty : 0
      };
    }),
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    status: 'preparing' // preparing | shipping | delivered
  };

  // Save order
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  // Clear cart (stock was already decremented)
  saveCart([]);
  updateCartBadge();
  renderCart();
  renderProducts();

  // Show success
  showOrderSuccess(order);
}

function showOrderSuccess(order) {
  const modalTitle = document.getElementById('checkoutModalTitle');
  const modalBody = document.getElementById('checkoutModalBody');
  const form = document.getElementById('checkoutForm');
  const summary = document.getElementById('checkoutSummary');

  if (form) form.style.display = 'none';
  if (summary) summary.style.display = 'none';
  if (modalTitle) modalTitle.textContent = '🎉 ¡Pedido Confirmado!';

  const successHTML = `
    <div class="order-success" id="orderSuccessView">
      <div class="order-success__icon">✅</div>
      <h3 class="order-success__title">¡Gracias por tu compra!</h3>
      <p class="order-success__text">
        Tu pedido <strong>${order.id}</strong> ha sido registrado exitosamente.<br>
        Total: <strong>${formatPrice(order.total)}</strong><br>
        Entrega: ${order.delivery.date} · ${order.delivery.time}<br>
        Pago: ${order.paymentMethod === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
      </p>
      <button class="order-success__btn" onclick="closeCheckoutAndReset()">
        🏪 Seguir Comprando
      </button>
    </div>
  `;

  // Insert after summary
  if (modalBody) {
    const existing = document.getElementById('orderSuccessView');
    if (existing) existing.remove();
    modalBody.insertAdjacentHTML('beforeend', successHTML);
  }

  // Reset form
  document.getElementById('checkoutForm')?.reset();
  // Reset payment cards
  document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
  document.querySelector('.payment-card[data-method="efectivo"]')?.classList.add('selected');
}

function closeCheckoutAndReset() {
  const modal = document.getElementById('checkoutModal');
  modal?.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Navbar scroll effect ──
function setupNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ══════════════════════════════════
//  ADMIN SIDE
// ══════════════════════════════════

function initAdmin() {
  if (!isAdminPage()) return;

  setupAdminSidebar();
  setupAdminInventory();
  setupAdminOrders();
  setupAdminUsers();
  refreshAdminDashboard();

  // Show mobile menu button on smaller screens
  const btnMobile = document.getElementById('btnMobileMenu');
  if (btnMobile && window.innerWidth <= 1024) {
    btnMobile.style.display = 'inline-flex';
    btnMobile.addEventListener('click', toggleSidebar);
  }
}

// ── Admin Sidebar ──
function setupAdminSidebar() {
  const links = document.querySelectorAll('.sidebar__link[data-section]');
  const overlay = document.getElementById('sidebarOverlay');
  const btnToggle = document.getElementById('btnToggleSidebar');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      switchSection(section);
      closeSidebar();
    });
  });

  if (overlay) overlay.addEventListener('click', closeSidebar);
  if (btnToggle) btnToggle.addEventListener('click', toggleSidebar);
}

function switchSection(sectionName) {
  // Update sidebar active link
  document.querySelectorAll('.sidebar__link[data-section]').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar__link[data-section="${sectionName}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Show section
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById('section' + sectionName.charAt(0).toUpperCase() + sectionName.slice(1));
  if (section) section.classList.add('active');

  // Update header
  const titles = {
    dashboard: ['Dashboard', 'Resumen general de Trapicampo'],
    inventory: ['Inventario', 'Control de productos y stock'],
    orders: ['Pedidos y Entregas', 'Gestión de pedidos a domicilio'],
    users: ['Usuarios', 'Gestión de usuarios y administradores']
  };

  const titleEl = document.getElementById('sectionTitle');
  const subtitleEl = document.getElementById('sectionSubtitle');
  if (titles[sectionName]) {
    if (titleEl) titleEl.textContent = titles[sectionName][0];
    if (subtitleEl) subtitleEl.textContent = titles[sectionName][1];
  }

  // Refresh specific sections
  if (sectionName === 'dashboard') refreshAdminDashboard();
  if (sectionName === 'inventory') renderInventoryTable();
  if (sectionName === 'orders') renderOrdersList();
  if (sectionName === 'users') renderUsersTable();
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// ── Dashboard ──
function refreshAdminDashboard() {
  const products = getProducts();
  const orders = getOrders();
  const users = typeof getUsers === 'function' ? getUsers() : [];

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const statProducts = document.getElementById('statProducts');
  const statRevenue = document.getElementById('statRevenue');
  const statOrders = document.getElementById('statOrders');
  const statLowStock = document.getElementById('statLowStock');
  const statUsers = document.getElementById('statUsers');
  const statActiveUsers = document.getElementById('statActiveUsers');

  if (statProducts) statProducts.textContent = totalProducts;
  if (statRevenue) statRevenue.textContent = formatPrice(totalRevenue);
  if (statOrders) statOrders.textContent = orders.length;
  if (statLowStock) statLowStock.textContent = lowStockProducts.length;
  if (statUsers) statUsers.textContent = users.length;
  if (statActiveUsers) statActiveUsers.textContent = users.filter(u => u.status === 'active').length;

  // Recent orders
  const recentContainer = document.getElementById('dashboardRecentOrders');
  if (recentContainer) {
    const recent = orders.slice(0, 3);
    if (recent.length === 0) {
      recentContainer.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 24px 0;">No hay pedidos aún. Los pedidos aparecerán aquí.</p>';
    } else {
      recentContainer.innerHTML = recent.map(o => `
        <div class="order-card" style="margin-bottom: 12px;">
          <div class="order-card__header">
            <span class="order-card__id">${o.id}</span>
            <span class="status-badge status-badge--${o.status === 'preparing' ? 'preparing' : o.status === 'shipping' ? 'shipping' : 'delivered'}">
              ${o.status === 'preparing' ? '🔄 En preparación' : o.status === 'shipping' ? '🚚 En camino' : '✅ Entregado'}
            </span>
          </div>
          <div class="order-card__customer">👤 ${o.customer.name}</div>
          <div class="order-card__footer">
            <span class="order-card__total">${formatPrice(o.total)}</span>
            <span class="order-card__date">${new Date(o.date).toLocaleDateString('es-CO')}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Low stock alerts
  const lowStockContainer = document.getElementById('dashboardLowStock');
  if (lowStockContainer) {
    if (lowStockProducts.length === 0) {
      lowStockContainer.innerHTML = '<p style="color: var(--gray-400); text-align: center; padding: 24px 0;">✅ Todos los productos tienen stock suficiente.</p>';
    } else {
      lowStockContainer.innerHTML = lowStockProducts.map(p => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">${p.emoji}</span>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">${p.name}</div>
              <div style="font-size: 0.8rem; color: var(--gray-400);">${getCategoryName(p.category)}</div>
            </div>
          </div>
          <span class="stock-badge stock-badge--low">⚠️ ${p.stock} unidades</span>
        </div>
      `).join('');
    }
  }
}

// ── Inventory Table ──
let currentEditingImages = [];

function setupImageUpload() {
  const input = document.getElementById('productImageInput');
  if (!input) return;
  input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`El archivo ${file.name} supera los 2MB`, 'error', 'adminToast');
        continue;
      }
      const base64 = await readFileAsBase64(file);
      currentEditingImages.push(base64);
    }
    input.value = ''; // Reset
    renderImagePreview();
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  const container = document.getElementById('productImagePreview');
  if (!container) return;
  container.innerHTML = currentEditingImages.map((src, idx) => `
    <div style="position: relative; padding-top: 100%; border-radius: 8px; overflow: hidden; border: ${idx === 0 ? '2px solid var(--primary-500)' : '1px solid var(--gray-200)'}">
      <img src="${src}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
      <div style="position: absolute; top: 4px; right: 4px; display: flex; gap: 4px;">
        ${idx > 0 ? `<button type="button" onclick="makeImageMain(${idx})" style="background: white; border: none; border-radius: 4px; cursor: pointer; padding: 2px 4px; font-size: 0.8rem;" title="Hacer principal">⭐</button>` : ''}
        <button type="button" onclick="removeImage(${idx})" style="background: white; border: none; border-radius: 4px; cursor: pointer; padding: 2px 4px; font-size: 0.8rem;" title="Eliminar">🗑️</button>
      </div>
      ${idx === 0 ? '<span style="position: absolute; bottom: 0; left: 0; right: 0; background: var(--primary-500); color: white; font-size: 0.6rem; text-align: center; padding: 2px 0;">Principal</span>' : ''}
    </div>
  `).join('');
}

window.makeImageMain = function(idx) {
  const img = currentEditingImages.splice(idx, 1)[0];
  currentEditingImages.unshift(img);
  renderImagePreview();
};

window.removeImage = function(idx) {
  currentEditingImages.splice(idx, 1);
  renderImagePreview();
};

function setupAdminInventory() {
  const btnAdd = document.getElementById('btnAddProduct');
  const modal = document.getElementById('productModal');
  const btnClose = document.getElementById('btnCloseProductModal');
  const form = document.getElementById('productForm');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openProductModal();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      closeProductModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProductModal();
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProductFromForm();
    });
  }

  setupImageUpload();
  renderInventoryTable();
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryBody');
  if (!tbody) return;

  const products = getProducts();

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--gray-400);">No hay productos en el inventario</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    const isLow = p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0;
    const isOut = p.stock === 0;
    let stockBadgeClass = 'stock-badge--ok';
    let stockLabel = `${p.stock} uds.`;
    if (isOut) {
      stockBadgeClass = 'stock-badge--low';
      stockLabel = 'Agotado';
    } else if (isLow) {
      stockBadgeClass = 'stock-badge--low';
      stockLabel = `⚠️ ${p.stock} uds.`;
    } else if (p.stock <= 10) {
      stockBadgeClass = 'stock-badge--medium';
      stockLabel = `${p.stock} uds.`;
    }

    return `
      <tr class="${isLow || isOut ? 'row-low-stock' : ''}">
        <td>
          <div class="data-table__product">
            <div class="data-table__product-icon">${p.emoji}</div>
            <span class="data-table__product-name">${p.name}</span>
          </div>
        </td>
        <td>${getCategoryName(p.category)}</td>
        <td style="font-weight: 600;">${formatPrice(p.price)}</td>
        <td>${p.stock}</td>
        <td><span class="stock-badge ${stockBadgeClass}">${stockLabel}</span></td>
        <td>
          <div class="data-table__actions">
            <button class="btn-edit" onclick="editProduct('${p.id}')">✏️ Editar</button>
            <button class="btn-danger" onclick="deleteProduct('${p.id}')">🗑️ Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openProductModal(product = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  if (form) form.reset();
  document.getElementById('productEditId').value = '';
  currentEditingImages = [];

  if (product) {
    if (title) title.textContent = '✏️ Editar Producto';
    document.getElementById('productEditId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productEmoji').value = product.emoji;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productUnit').value = product.unit;
    if (productImagesCache[product.id]) {
      currentEditingImages = [...productImagesCache[product.id]];
    }
  } else {
    if (title) title.textContent = '➕ Agregar Producto';
  }

  renderImagePreview();
  modal?.classList.add('active');
}

function closeProductModal() {
  document.getElementById('productModal')?.classList.remove('active');
}

async function saveProductFromForm() {
  const editId = document.getElementById('productEditId').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const emoji = document.getElementById('productEmoji').value.trim();
  const price = parseInt(document.getElementById('productPrice').value);
  const stock = parseInt(document.getElementById('productStock').value);
  const unit = document.getElementById('productUnit').value.trim();

  if (!name || !category || !emoji || isNaN(price) || isNaN(stock) || !unit) {
    showToast('Completa todos los campos', 'error', 'adminToast');
    return;
  }

  const products = getProducts();
  let productId;

  if (editId) {
    // Edit existing
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, category, emoji, price, stock, unit };
    }
    productId = editId;
    showToast(`${name} actualizado correctamente`, 'success', 'adminToast');
  } else {
    // Add new
    const newProduct = {
      id: generateId(),
      name,
      category,
      emoji,
      price,
      stock,
      unit,
      organic: false
    };
    products.push(newProduct);
    productId = newProduct.id;
    showToast(`${name} agregado al inventario`, 'success', 'adminToast');
  }

  await saveImagesToDB(productId, currentEditingImages);

  saveProducts(products);
  closeProductModal();
  renderInventoryTable();
  refreshAdminDashboard();
}

function editProduct(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (product) {
    openProductModal(product);
  }
}

async function deleteProduct(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (!confirm(`¿Eliminar "${product.name}" del inventario?`)) return;

  const newProducts = products.filter(p => p.id !== id);
  saveProducts(newProducts);

  await deleteImagesFromDB(id);

  // Also remove from cart if present
  const cart = getCart().filter(c => c.productId !== id);
  saveCart(cart);

  renderInventoryTable();
  refreshAdminDashboard();
  showToast(`${product.name} eliminado`, 'warning', 'adminToast');
}

// ── Orders Management ──
function setupAdminOrders() {
  renderOrdersList();
}

function renderOrdersList() {
  const container = document.getElementById('ordersList');
  const countEl = document.getElementById('ordersCount');
  if (!container) return;

  const orders = getOrders();
  if (countEl) countEl.textContent = `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`;

  if (orders.length === 0) {
    container.innerHTML = `
      <p style="color: var(--gray-400); text-align: center; padding: 40px 0;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 12px;">📋</span>
        No hay pedidos registrados aún.<br>
        <small>Los pedidos aparecerán aquí cuando los clientes compren en la tienda.</small>
      </p>
    `;
    return;
  }

  container.innerHTML = orders.map(o => {
    const statusOptions = ['preparing', 'shipping', 'delivered'];
    const statusLabels = {
      preparing: '🔄 En preparación',
      shipping: '🚚 En camino',
      delivered: '✅ Entregado'
    };

    return `
      <div class="order-card">
        <div class="order-card__header">
          <span class="order-card__id">${o.id}</span>
          <span class="order-card__date">${new Date(o.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="order-card__customer">👤 ${o.customer.name} · 📞 ${o.customer.phone}</div>
        <div class="order-card__address">📍 ${o.customer.address}</div>
        <div class="order-card__items">
          ${o.items.map(i => `${i.emoji} ${i.name} × ${i.qty} — ${formatPrice(i.subtotal)}`).join('<br>')}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
          <span style="font-size: 0.8rem; color: var(--gray-500);">📅 Entrega: ${o.delivery.date} · ${o.delivery.time}</span>
          <span style="font-size: 0.8rem; color: var(--gray-500);">💳 ${o.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}</span>
          ${o.notes ? `<span style="font-size: 0.8rem; color: var(--gray-500);">📝 ${o.notes}</span>` : ''}
        </div>
        <div class="order-card__footer">
          <span class="order-card__total">${formatPrice(o.total)}</span>
          <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)" aria-label="Estado del pedido">
            ${statusOptions.map(s => `
              <option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabels[s]}</option>
            `).join('')}
          </select>
        </div>
      </div>
    `;
  }).join('');
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    saveOrders(orders);
    refreshAdminDashboard();
    const labels = { preparing: 'En preparación', shipping: 'En camino', delivered: 'Entregado' };
    showToast(`Pedido ${orderId}: ${labels[newStatus]}`, 'success', 'adminToast');
  }
}

// ══════════════════════════════════
//  USERS MANAGEMENT (Admin)
// ══════════════════════════════════

function setupAdminUsers() {
  const btnAdd = document.getElementById('btnAddUser');
  const modal = document.getElementById('userModal');
  const btnClose = document.getElementById('btnCloseUserModal');
  const form = document.getElementById('userForm');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openUserModal();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      closeUserModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeUserModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveUserFromForm();
    });
  }

  // Clear errors on input
  ['FullName', 'Email', 'Password', 'Role'].forEach(field => {
    const el = document.getElementById('user' + field);
    if (el) {
      el.addEventListener('input', () => {
        const errorEl = document.getElementById('userError' + field);
        if (errorEl) errorEl.textContent = '';
      });
    }
  });
}

function renderUsersTable() {
  const tbody = document.getElementById('usersBody');
  if (!tbody) return;

  const users = typeof getUsers === 'function' ? getUsers() : [];

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--gray-400);">No hay usuarios registrados</td></tr>';
    return;
  }

  // Sort: admins first, then by date
  const sorted = [...users].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  tbody.innerHTML = sorted.map(u => {
    const session = typeof getCurrentSession === 'function' ? getCurrentSession() : null;
    const isMe = session && session.userId === u.id;
    const roleBadge = u.role === 'admin' 
      ? '<span class="user-role-badge user-role-badge--admin">⚡ Admin</span>' 
      : '<span class="user-role-badge user-role-badge--user">👤 User</span>';
      
    const statusBadge = u.status === 'active'
      ? '<span class="user-status-badge user-status-badge--active">Activo</span>'
      : '<span class="user-status-badge user-status-badge--inactive">Inactivo</span>';

    const statusActionLabel = u.status === 'active' ? '🚫 Bloquear' : '✅ Activar';
    const statusActionClass = u.status === 'active' ? 'btn-block' : 'btn-activate';

    return `
      <tr>
        <td>
          <div class="data-table__product">
            <div class="data-table__product-icon" style="background: var(--gray-100);">${u.fullName.charAt(0).toUpperCase()}</div>
            <div>
              <span class="data-table__product-name">${u.fullName} ${isMe ? ' <small style="color:var(--green-600);">(Tú)</small>' : ''}</span>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>${new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
        <td>
          <div class="data-table__actions">
            <button class="btn-edit" onclick="editUserHandler('${u.id}')">✏️ Editar</button>
            ${!isMe ? `
              <button class="${statusActionClass}" onclick="toggleUserStatusHandler('${u.id}')">${statusActionLabel}</button>
              <button class="btn-danger" onclick="deleteUserHandler('${u.id}')">🗑️ Eliminar</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openUserModal(user = null) {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const form = document.getElementById('userForm');
  
  if (form) form.reset();
  document.getElementById('userEditId').value = '';
  
  // Clear previous errors
  ['FullName', 'Email', 'Password', 'Role'].forEach(f => {
    const el = document.getElementById('userError' + f);
    if (el) el.textContent = '';
  });

  if (user) {
    if (title) title.textContent = '✏️ Editar Usuario';
    document.getElementById('userEditId').value = user.id;
    document.getElementById('userFullName').value = user.fullName;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status || 'active';
    document.getElementById('userPassword').required = false;
  } else {
    if (title) title.textContent = '➕ Crear Usuario';
    document.getElementById('userPassword').required = true;
    document.getElementById('userStatus').value = 'active';
  }

  modal?.classList.add('active');
}

function closeUserModal() {
  document.getElementById('userModal')?.classList.remove('active');
}

async function saveUserFromForm() {
  const editId = document.getElementById('userEditId').value;
  const fullName = document.getElementById('userFullName').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;

  const btnSubmit = document.querySelector('#userForm button[type="submit"]');
  const originalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = 'Guardando...';

  let result;

  if (editId) {
    result = await updateUserByAdmin(editId, { fullName, email, password, role, status });
  } else {
    result = await createUserByAdmin(fullName, email, password, role);
  }

  btnSubmit.disabled = false;
  btnSubmit.innerHTML = originalText;

  if (!result.success) {
    if (result.errors) {
      if (result.errors.fullName) document.getElementById('userErrorFullName').textContent = result.errors.fullName;
      if (result.errors.email) document.getElementById('userErrorEmail').textContent = result.errors.email;
      if (result.errors.password) document.getElementById('userErrorPassword').textContent = result.errors.password;
      if (result.errors.role) document.getElementById('userErrorRole').textContent = result.errors.role;
    } else {
      showToast(result.error || 'Ocurrió un error', 'error', 'adminToast');
    }
    return;
  }

  closeUserModal();
  renderUsersTable();
  refreshAdminDashboard();
  showToast(editId ? 'Usuario actualizado' : 'Usuario creado', 'success', 'adminToast');
}

function editUserHandler(id) {
  const users = typeof getUsers === 'function' ? getUsers() : [];
  const user = users.find(u => u.id === id);
  if (user) {
    openUserModal(user);
  }
}

function deleteUserHandler(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar este usuario permanentemente?')) return;
  
  if (typeof deleteUserById === 'function') {
    const result = deleteUserById(id);
    if (result.success) {
      renderUsersTable();
      refreshAdminDashboard();
      showToast('Usuario eliminado', 'warning', 'adminToast');
    } else {
      showToast(result.error || 'No se pudo eliminar el usuario', 'error', 'adminToast');
    }
  }
}

function toggleUserStatusHandler(id) {
  if (typeof toggleUserStatus === 'function') {
    const result = toggleUserStatus(id);
    if (result.success) {
      renderUsersTable();
      refreshAdminDashboard();
      const isAct = result.newStatus === 'active';
      showToast(isAct ? 'Usuario activado' : 'Usuario bloqueado', isAct ? 'success' : 'warning', 'adminToast');
    } else {
      showToast(result.error || 'No se pudo cambiar el estado', 'error', 'adminToast');
    }
  }
}

// ══════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // Init products in localStorage if needed
  getProducts();
  
  // Load images from IndexedDB
  await loadAllImagesToCache();

  if (isClientPage()) {
    setupNavbarScroll();
    setupCategories();
    setupSearch();
    setupProductDetail();
    setupCartDrawer();
    setupCheckout();
    renderProducts();
    renderCart();
    updateCartBadge();
  }

  // Admin init is called from admin.html inline script
});
