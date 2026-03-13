const currency = (amount) => `₹${amount.toFixed(2)}`;

const STORAGE_KEYS = {
  MENU: "hotel_menu_items",
  CART: "hotel_cart_items",
  INVOICE: "hotel_last_invoice",
};

// Initial static menu items (using open-source style image URLs)
const defaultMenuItems = [
  {
    id: 1,
    name: "Chicken Biriyani",
    category: "Biriyani",
    price: 220,
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chickenbiryani.JPG?width=800",
    description: "Fragrant basmati rice with tender chicken, cooked in hotel-style masala.",
  },
  {
    id: 2,
    name: "Mutton Biriyani",
    category: "Biriyani",
    price: 280,
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Hyderabadi_mutton_biryani.jpg?width=800",
    description: "Slow-cooked mutton layered with aromatic rice and spices.",
  },
  {
    id: 3,
    name: "Egg Rice",
    category: "Rice",
    price: 150,
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Homemade_fried_rice_at_home.jpg?width=800",
    description: "Stir-fried rice tossed with eggs, spring onions, and mild spices.",
  },
  {
    id: 4,
    name: "Chicken Fried Rice",
    category: "Rice",
    price: 180,
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chicken_fried_rice.jpg?width=800",
    description: "Classic Indo-Chinese fried rice with shredded chicken.",
  },
  {
    id: 5,
    name: "White Rice",
    category: "Rice",
    price: 100,
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Steamed_rice_in_bowl_01.jpg?width=800",
    description: "Steamed white rice, perfect with curries and gravies.",
  },
];

// State
let menuItems = [];
let cart = [];
let activeFilter = "all";

// DOM references
const els = {};

function cacheElements() {
  els.menuList = document.getElementById("menu-list");
  els.menuFilters = document.getElementById("menu-filters");

  els.cartItems = document.getElementById("cart-items");
  els.cartItemCount = document.getElementById("cart-item-count");
  els.cartSubtotal = document.getElementById("cart-subtotal");
  els.cartTotal = document.getElementById("cart-total");
  els.clearCartBtn = document.getElementById("clear-cart-btn");
  els.checkoutBtn = document.getElementById("checkout-btn");

  els.invoiceContainer = document.getElementById("invoice-container");
  els.printInvoiceBtn = document.getElementById("print-invoice-btn");

  els.menuForm = document.getElementById("menu-form");
  els.menuFormTitle = document.getElementById("menu-form-title");
  els.dishName = document.getElementById("dish-name");
  els.dishCategory = document.getElementById("dish-category");
  els.dishPrice = document.getElementById("dish-price");
  els.dishImageUrl = document.getElementById("dish-image-url");
  els.dishDescription = document.getElementById("dish-description");
  els.editingDishId = document.getElementById("editing-dish-id");
  els.resetFormBtn = document.getElementById("reset-form-btn");
  els.adminMenuList = document.getElementById("admin-menu-list");

  els.upiAmount = document.getElementById("upi-amount");
  els.upiName = document.getElementById("upi-name");
  els.upiNote = document.getElementById("upi-note");
  els.upiGenerateBtn = document.getElementById("upi-generate-btn");
  els.upiLink = document.getElementById("upi-link");

  els.footerYear = document.getElementById("footer-year");
}

// Storage helpers
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
}

// UPI link generation (frontend-only helper)
const UPI_CONSTANTS = {
  id: "your-upi-id@bank",
  name: "Spice Haven Hotel",
  currency: "INR",
};

function buildUpiUrl({ amount, payerName, note }) {
  const params = new URLSearchParams();
  params.set("pa", UPI_CONSTANTS.id);
  params.set("pn", UPI_CONSTANTS.name);
  if (amount && amount > 0) params.set("am", amount.toString());
  params.set("cu", UPI_CONSTANTS.currency);
  if (payerName) params.set("pn", payerName);
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

function updateUpiLink() {
  if (!els.upiLink) return;
  const rawAmount = els.upiAmount?.value ?? "";
  const payerName = (els.upiName?.value || "").trim() || UPI_CONSTANTS.name;
  const note = (els.upiNote?.value || "").trim() || "Spice Haven bill payment";

  const amount = Number(rawAmount);
  if (!rawAmount || Number.isNaN(amount) || amount <= 0) {
    els.upiLink.textContent = "Enter a valid amount to generate link";
    els.upiLink.removeAttribute("href");
    els.upiLink.classList.add("disabled");
    return;
  }

  const url = buildUpiUrl({ amount, payerName, note });
  els.upiLink.href = url;
  els.upiLink.textContent = "Open in UPI app";
  els.upiLink.classList.remove("disabled");
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., private mode)
  }
}

// Menu logic
function initMenu() {
  const storedMenu = loadFromStorage(STORAGE_KEYS.MENU, null);
  menuItems = Array.isArray(storedMenu) && storedMenu.length ? storedMenu : defaultMenuItems.slice();
  renderMenu();
  renderAdminMenuList();
}

function getNextMenuId() {
  const ids = menuItems.map((m) => m.id);
  const maxId = ids.length ? Math.max(...ids) : 0;
  return maxId + 1;
}

function renderMenu() {
  if (!els.menuList) return;

  const itemsToShow =
    activeFilter === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === activeFilter);

  if (!itemsToShow.length) {
    els.menuList.innerHTML = `<p class="admin-menu-list-empty">No dishes available. Use the Manage Menu section to add some.</p>`;
    return;
  }

  els.menuList.innerHTML = itemsToShow
    .map((item) => {
      const safeImg = item.imageUrl || "https://via.placeholder.com/400x250?text=Dish+Image";
      const desc = item.description || "";
      return `
        <article class="card menu-card" data-id="${item.id}">
          <div class="menu-card-img-wrap">
            <img src="${safeImg}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/400x250?text=Dish+Image';" />
          </div>
          <div class="menu-card-body">
            <div class="menu-card-header">
              <div>
                <div class="menu-card-title">${item.name}</div>
                <div class="menu-card-category">${item.category}</div>
              </div>
              <div class="menu-card-price">${currency(item.price)}</div>
            </div>
            ${
              desc
                ? `<p class="menu-card-desc">${desc}</p>`
                : ""
            }
            <div class="menu-card-footer">
              <button class="btn-primary" data-action="add-to-cart" data-id="${item.id}">Add to Cart</button>
              <button class="btn-secondary" data-action="admin-edit" data-id="${item.id}">Edit</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

// Cart logic
function initCart() {
  cart = loadFromStorage(STORAGE_KEYS.CART, []);
  if (!Array.isArray(cart)) cart = [];
  renderCart();
}

function findCartItem(itemId) {
  return cart.find((entry) => entry.itemId === itemId);
}

function addToCart(itemId) {
  const item = menuItems.find((m) => m.id === itemId);
  if (!item) return;

  const existing = findCartItem(itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      itemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
  }
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
}

function updateCartQuantity(itemId, delta) {
  const existing = findCartItem(itemId);
  if (!existing) return;
  existing.quantity += delta;
  if (existing.quantity <= 0) {
    cart = cart.filter((entry) => entry.itemId !== itemId);
  }
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
}

function removeFromCart(itemId) {
  cart = cart.filter((entry) => entry.itemId !== itemId);
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
}

function clearCart() {
  cart = [];
  saveToStorage(STORAGE_KEYS.CART, cart);
  renderCart();
}

function calculateCartTotals() {
  const itemCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cart.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  const total = subtotal;
  return { itemCount, subtotal, total };
}

function renderCart() {
  if (!els.cartItems) return;

  if (!cart.length) {
    els.cartItems.innerHTML = `<p class="cart-empty">Your cart is empty. Add some delicious biriyani and rice!</p>`;
  } else {
    els.cartItems.innerHTML = cart
      .map((entry) => {
        const lineTotal = entry.price * entry.quantity;
        return `
          <div class="cart-row" data-id="${entry.itemId}">
            <div class="cart-row-main">
              <div class="cart-row-title">${entry.name}</div>
              <div class="cart-row-meta">₹${entry.price} x ${entry.quantity}</div>
              <div class="cart-row-actions">
                <button class="qty-btn" data-action="decrease" data-id="${entry.itemId}">−</button>
                <span class="cart-qty">${entry.quantity}</span>
                <button class="qty-btn" data-action="increase" data-id="${entry.itemId}">+</button>
                <button class="btn-ghost" data-action="remove" data-id="${entry.itemId}">Remove</button>
              </div>
            </div>
            <div class="cart-row-total">${currency(lineTotal)}</div>
          </div>
        `;
      })
      .join("");
  }

  const totals = calculateCartTotals();
  els.cartItemCount.textContent = totals.itemCount.toString();
  els.cartSubtotal.textContent = currency(totals.subtotal);
  els.cartTotal.textContent = currency(totals.total);

  const hasItems = cart.length > 0;
  els.checkoutBtn.disabled = !hasItems;
  els.clearCartBtn.disabled = !hasItems;
}

// Invoice logic
function generateInvoice() {
  if (!cart.length) {
    alert("Your cart is empty. Add items before generating an invoice.");
    return;
  }

  const totals = calculateCartTotals();
  const now = new Date();
  const invoice = {
    id: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${now.getTime().toString().slice(-4)}`,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    items: cart.map((entry) => ({
      name: entry.name,
      price: entry.price,
      quantity: entry.quantity,
      total: entry.price * entry.quantity,
    })),
    subtotal: totals.subtotal,
    total: totals.total,
  };

  saveToStorage(STORAGE_KEYS.INVOICE, invoice);
  renderInvoice(invoice);
  els.printInvoiceBtn.disabled = false;
}

function renderInvoice(invoice) {
  if (!els.invoiceContainer || !invoice) {
    els.invoiceContainer.innerHTML =
      '<p class="cart-empty">No invoice generated yet. Add items to your cart and click "Generate Invoice".</p>';
    els.printInvoiceBtn.disabled = true;
    return;
  }

  const rows = invoice.items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${currency(item.price)}</td>
        <td>${item.quantity}</td>
        <td>${currency(item.total)}</td>
      </tr>
    `
    )
    .join("");

  els.invoiceContainer.innerHTML = `
    <div class="invoice-header">
      <div class="invoice-brand">
        <div class="invoice-brand-name">Spice Haven Hotel</div>
        <div>Hotel-style Food Ordering</div>
        <div>Chennai · Tamil Nadu</div>
      </div>
      <div class="invoice-meta">
        <div>Invoice #: ${invoice.id}</div>
        <div>Date: ${invoice.date}</div>
        <div>Time: ${invoice.time}</div>
      </div>
    </div>
    <table class="invoice-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Rate</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="invoice-summary">
      <div class="invoice-summary-row">
        <span>Subtotal</span>
        <span>${currency(invoice.subtotal)}</span>
      </div>
      <div class="invoice-summary-row invoice-summary-total">
        <span>Grand Total</span>
        <span>${currency(invoice.total)}</span>
      </div>
    </div>
    <div class="invoice-footer">
      <p>Thank you for dining with Spice Haven. This is a computer-generated invoice.</p>
      <p>For demo purposes only. Configure your own payment details in the UPI section.</p>
    </div>
  `;
}

// Admin CRUD logic
function resetMenuForm() {
  els.menuFormTitle.textContent = "Add New Dish";
  els.dishName.value = "";
  els.dishCategory.value = "Biriyani";
  els.dishPrice.value = "";
  els.dishImageUrl.value = "";
  els.dishDescription.value = "";
  els.editingDishId.value = "";
}

function handleMenuFormSubmit(event) {
  event.preventDefault();

  const name = els.dishName.value.trim();
  const category = els.dishCategory.value;
  const price = Number(els.dishPrice.value);
  const imageUrl = els.dishImageUrl.value.trim();
  const description = els.dishDescription.value.trim();

  if (!name || !category || !price || price <= 0 || Number.isNaN(price)) {
    alert("Please enter a valid name, category, and positive price.");
    return;
  }

  const editingId = Number(els.editingDishId.value || 0);

  if (editingId) {
    const index = menuItems.findIndex((m) => m.id === editingId);
    if (index !== -1) {
      menuItems[index] = {
        ...menuItems[index],
        name,
        category,
        price,
        imageUrl,
        description,
      };
    }
  } else {
    const newItem = {
      id: getNextMenuId(),
      name,
      category,
      price,
      imageUrl,
      description,
    };
    menuItems.push(newItem);
  }

  saveToStorage(STORAGE_KEYS.MENU, menuItems);
  renderMenu();
  renderAdminMenuList();
  resetMenuForm();
}

function populateFormForEdit(id) {
  const item = menuItems.find((m) => m.id === id);
  if (!item) return;
  els.menuFormTitle.textContent = "Edit Dish";
  els.dishName.value = item.name;
  els.dishCategory.value = item.category;
  els.dishPrice.value = item.price;
  els.dishImageUrl.value = item.imageUrl || "";
  els.dishDescription.value = item.description || "";
  els.editingDishId.value = String(item.id);
  window.location.hash = "#admin";
}

function deleteMenuItem(id) {
  const confirmed = confirm("Are you sure you want to delete this dish?");
  if (!confirmed) return;
  menuItems = menuItems.filter((m) => m.id !== id);
  saveToStorage(STORAGE_KEYS.MENU, menuItems);
  renderMenu();
  renderAdminMenuList();
}

function renderAdminMenuList() {
  if (!els.adminMenuList) return;

  if (!menuItems.length) {
    els.adminMenuList.innerHTML =
      '<p class="admin-menu-list-empty">No dishes yet. Use the form to add a new dish.</p>';
    return;
  }

  els.adminMenuList.innerHTML = menuItems
    .map(
      (item) => `
      <div class="admin-menu-row" data-id="${item.id}">
        <div class="admin-menu-main">
          <div class="admin-menu-main-title">${item.name}</div>
          <div class="admin-menu-main-meta">${item.category} • ${currency(item.price)}</div>
        </div>
        <div class="admin-menu-main-meta">
          ${item.imageUrl ? "Custom image" : "Default/placeholder image"}
        </div>
        <div class="admin-menu-actions">
          <button class="btn-secondary" data-action="admin-edit" data-id="${item.id}">Edit</button>
          <button class="btn-ghost" data-action="admin-delete" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");
}

// Event wiring
function setupEventListeners() {
  if (els.menuFilters) {
    els.menuFilters.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-filter]");
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      document
        .querySelectorAll("#menu-filters .chip")
        .forEach((chip) => chip.classList.toggle("chip-active", chip === btn));
      renderMenu();
    });
  }

  if (els.menuList) {
    els.menuList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const id = Number(button.dataset.id);
      if (!id) return;

      if (action === "add-to-cart") {
        addToCart(id);
      } else if (action === "admin-edit") {
        populateFormForEdit(id);
      }
    });
  }

  if (els.cartItems) {
    els.cartItems.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const id = Number(button.dataset.id);
      if (!id) return;

      if (action === "increase") {
        updateCartQuantity(id, 1);
      } else if (action === "decrease") {
        updateCartQuantity(id, -1);
      } else if (action === "remove") {
        removeFromCart(id);
      }
    });
  }

  if (els.clearCartBtn) {
    els.clearCartBtn.addEventListener("click", () => {
      if (!cart.length) return;
      const confirmed = confirm("Clear all items from the cart?");
      if (confirmed) clearCart();
    });
  }

  if (els.checkoutBtn) {
    els.checkoutBtn.addEventListener("click", () => {
      generateInvoice();
    });
  }

  if (els.printInvoiceBtn) {
    els.printInvoiceBtn.addEventListener("click", () => {
      if (!els.printInvoiceBtn.disabled) {
        window.print();
      }
    });
  }

  if (els.menuForm) {
    els.menuForm.addEventListener("submit", handleMenuFormSubmit);
  }

  if (els.resetFormBtn) {
    els.resetFormBtn.addEventListener("click", resetMenuForm);
  }

  if (els.adminMenuList) {
    els.adminMenuList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      const id = Number(button.dataset.id);
      if (!id) return;

      if (action === "admin-edit") {
        populateFormForEdit(id);
      } else if (action === "admin-delete") {
        deleteMenuItem(id);
      }
    });
  }

  if (els.upiGenerateBtn) {
    els.upiGenerateBtn.addEventListener("click", (event) => {
      event.preventDefault();
      updateUpiLink();
    });
  }

  if (els.upiAmount) {
    els.upiAmount.addEventListener("input", () => {
      if (els.upiLink?.href) {
        updateUpiLink();
      }
    });
  }
}

function initFooter() {
  if (els.footerYear) {
    els.footerYear.textContent = String(new Date().getFullYear());
  }
}

function initInvoiceFromStorage() {
  const storedInvoice = loadFromStorage(STORAGE_KEYS.INVOICE, null);
  if (storedInvoice) {
    renderInvoice(storedInvoice);
    els.printInvoiceBtn.disabled = false;
  } else {
    renderInvoice(null);
  }
}

function init() {
  cacheElements();
  initMenu();
  initCart();
  initInvoiceFromStorage();
  setupEventListeners();
  initFooter();
}

document.addEventListener("DOMContentLoaded", init);

