const CATEGORY_LABELS = {
  TODOS: "Todos",
  BRASILEIRAO: "Brasileirão",
  INTERNACIONAIS: "Internacionais",
  SELECOES: "Seleções",
  RETRO: "Retrô",
  INFANTIL: "Infantil",
  FEMININA: "Feminina"
};

const STATUS_LABELS = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  SENT_TO_PARTNER: "Pedido em preparação",
  TRACKING_RECEIVED: "Rastreio recebido",
  SHIPPED: "Pedido enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

const PAYMENT_LABELS = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REFUSED: "Recusado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Contestado"
};

const DEMO_PRODUCTS = [
  {
    id: "demo-001", sku: "MS-001", slug: "camisa-aurora-2026", name: "Camisa Aurora 2026",
    description: "Modelo torcedor com tecido leve, acabamento premium e opções de personalização.",
    category: "BRASILEIRAO", price: 149.9, compareAtPrice: 179.9, imageUrl: null, badge: "Lançamento", tone: "gold",
    variants: ["P", "M", "G", "GG", "2GG"].map((size, index) => ({ id: `demo-001-${index}`, size, stock: 20 }))
  },
  {
    id: "demo-002", sku: "MS-002", slug: "camisa-imperial-away", name: "Camisa Imperial Away",
    description: "Camisa visitante em visual clássico, com caimento confortável para o dia a dia.",
    category: "INTERNACIONAIS", price: 159.9, compareAtPrice: 189.9, imageUrl: null, badge: "Mais vendido", tone: "white",
    variants: ["P", "M", "G", "GG"].map((size, index) => ({ id: `demo-002-${index}`, size, stock: 18 }))
  },
  {
    id: "demo-003", sku: "MS-003", slug: "camisa-selecao-classica", name: "Camisa Seleção Clássica",
    description: "Edição inspirada em grandes campanhas, com detalhes retrô e gola reforçada.",
    category: "SELECOES", price: 139.9, compareAtPrice: 169.9, imageUrl: null, badge: "Retrô", tone: "green",
    variants: ["P", "M", "G", "GG", "2GG"].map((size, index) => ({ id: `demo-003-${index}`, size, stock: 14 }))
  },
  {
    id: "demo-004", sku: "MS-004", slug: "camisa-eclipse-player", name: "Camisa Eclipse Player",
    description: "Versão jogador com corte ajustado e construção voltada para alta performance.",
    category: "INTERNACIONAIS", price: 179.9, compareAtPrice: 209.9, imageUrl: null, badge: "Versão jogador", tone: "blue",
    variants: ["P", "M", "G", "GG"].map((size, index) => ({ id: `demo-004-${index}`, size, stock: 11 }))
  },
  {
    id: "demo-005", sku: "MS-005", slug: "kit-pequeno-craque", name: "Kit Pequeno Craque",
    description: "Conjunto infantil com camisa e calção para os pequenos torcedores.",
    category: "INFANTIL", price: 129.9, compareAtPrice: 149.9, imageUrl: null, badge: "Infantil", tone: "red",
    variants: ["16", "18", "20", "22", "24", "26", "28"].map((size, index) => ({ id: `demo-005-${index}`, size, stock: 12 }))
  },
  {
    id: "demo-006", sku: "MS-006", slug: "camisa-lendaria-1999", name: "Camisa Lendária 1999",
    description: "Edição especial com visual histórico e acabamento inspirado nos anos 1990.",
    category: "RETRO", price: 169.9, compareAtPrice: 199.9, imageUrl: null, badge: "Edição especial", tone: "black",
    variants: ["P", "M", "G", "GG", "2GG"].map((size, index) => ({ id: `demo-006-${index}`, size, stock: 9 }))
  }
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const $ = (id) => document.getElementById(id);

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const state = {
  apiUrl: "",
  apiOnline: false,
  products: [],
  query: "",
  category: "TODOS",
  favorites: new Set(readStorage("manto:favorites", [])),
  cart: readStorage("manto:cart", []),
  localOrders: readStorage("manto:orders", []),
  showFavorites: false,
  selectedProduct: null,
  selectedSize: "",
  selectedQuantity: 1
};

function persist() {
  localStorage.setItem("manto:favorites", JSON.stringify([...state.favorites]));
  localStorage.setItem("manto:cart", JSON.stringify(state.cart));
  localStorage.setItem("manto:orders", JSON.stringify(state.localOrders.slice(0, 20)));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function safeImageUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    const allowedHosts = new Set([
      window.location.host,
      "firebasestorage.googleapis.com",
      "storage.googleapis.com"
    ]);
    if (state.apiUrl) allowedHosts.add(new URL(state.apiUrl).host);
    return parsed.protocol === "https:" && allowedHosts.has(parsed.host) ? parsed.href : "";
  } catch {
    return "";
  }
}

function toneFor(product, index = 0) {
  if (product.tone) return product.tone;
  return ["gold", "white", "green", "blue", "red", "black"][index % 6];
}

function normalizeProduct(product, index) {
  const price = Number(product.price || 0);
  const compareAtPrice = product.compareAtPrice == null ? null : Number(product.compareAtPrice);
  return {
    ...product,
    id: String(product.id),
    sku: String(product.sku || `MS-${String(index + 1).padStart(3, "0")}`),
    slug: String(product.slug || product.id),
    name: String(product.name || "Manto Sagrado"),
    description: String(product.description || "Camisa selecionada pela Manto Sagrado."),
    category: CATEGORY_LABELS[product.category] ? product.category : "BRASILEIRAO",
    price: Number.isFinite(price) ? price : 0,
    compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : null,
    imageUrl: safeImageUrl(product.imageUrl),
    badge: product.badge ? String(product.badge) : "Manto Sagrado",
    variants: Array.isArray(product.variants) ? product.variants.filter((variant) => Number(variant.stock) > 0) : [],
    tone: toneFor(product, index)
  };
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  $("toast-region").appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function openModal(id) {
  $(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  $(id).classList.add("hidden");
  if ([...document.querySelectorAll(".modal-backdrop, .drawer-backdrop")].every((element) => element.classList.contains("hidden"))) {
    document.body.style.overflow = "";
  }
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function visibleProducts() {
  const query = state.query.trim().toLocaleLowerCase("pt-BR");
  return state.products.filter((product) => {
    const categoryMatches = state.category === "TODOS" || product.category === state.category;
    const queryMatches = !query || `${product.name} ${product.description} ${categoryLabel(product.category)} ${product.badge}`.toLocaleLowerCase("pt-BR").includes(query);
    const favoriteMatches = !state.showFavorites || state.favorites.has(product.id);
    return categoryMatches && queryMatches && favoriteMatches;
  });
}

async function getRuntimeConfig() {
  try {
    const response = await fetch("/runtime-config.js", { cache: "no-store" });
    if (!response.ok) return;
    const text = await response.text();
    const match = text.match(/apiUrl:\s*(["'])(.*?)\1/);
    state.apiUrl = normalizeApiUrl(match?.[2]);
  } catch {
    state.apiUrl = "";
  }
}

async function apiRequest(path, options = {}) {
  if (!state.apiUrl) throw new Error("API ainda não configurada");
  const response = await fetch(`${state.apiUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message;
    throw new Error(Array.isArray(message) ? message.join(" ") : message || "Não foi possível concluir a solicitação");
  }
  return body;
}

async function loadCatalog() {
  await getRuntimeConfig();
  try {
    if (!state.apiUrl) throw new Error("API sem endereço público");
    const payload = await apiRequest("/v1/products");
    const products = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(products) || !products.length) throw new Error("Catálogo vazio");
    state.products = products.map(normalizeProduct);
    state.apiOnline = true;
  } catch (error) {
    state.products = DEMO_PRODUCTS.map(normalizeProduct);
    state.apiOnline = false;
    console.info("Catálogo demonstrativo ativo:", error.message);
  }
  $("catalog-loading").classList.add("hidden");
  $("product-grid").classList.remove("hidden");
  updateCatalogMode();
  render();
}

function updateCatalogMode() {
  const element = $("catalog-mode");
  element.textContent = state.apiOnline ? "Catálogo conectado" : "Modo demonstração";
  element.classList.toggle("online", state.apiOnline);
  element.title = state.apiOnline
    ? "Produtos carregados da API Manto Sagrado"
    : "Produtos demonstrativos. A API será conectada após a publicação do Cloud Run.";
}

function renderCategories() {
  const available = ["TODOS", ...new Set(state.products.map((product) => product.category))];
  $("categories").innerHTML = available.map((category) => `
    <button class="category ${state.category === category ? "active" : ""}" data-category="${escapeHtml(category)}">
      <span class="category-icon">${category === "TODOS" ? "✦" : "◈"}</span>${escapeHtml(categoryLabel(category))}
    </button>`).join("");
}

function productVisual(product) {
  if (product.imageUrl) {
    return `<img class="product-photo" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">`;
  }
  return `<div class="shirt"><span>${escapeHtml(product.sku.slice(-2))}</span></div>`;
}

function renderProducts() {
  const list = visibleProducts();
  $("products-title").textContent = state.showFavorites ? "Favoritos" : state.query ? "Resultados" : "Lançamentos";
  $("result-count").textContent = `${list.length} ${list.length === 1 ? "produto" : "produtos"}`;
  $("product-grid").classList.toggle("hidden", !list.length);
  $("empty-state").classList.toggle("hidden", Boolean(list.length));
  $("product-grid").innerHTML = list.map((product, index) => {
    const discount = product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;
    const favorite = state.favorites.has(product.id);
    return `<article class="product-card">
      <button class="product-open" data-product="${escapeHtml(product.id)}" aria-label="Ver ${escapeHtml(product.name)}">
        <div class="product-image tone-${escapeHtml(toneFor(product, index))}">
          <span class="product-badge">${escapeHtml(product.badge || "Manto Sagrado")}</span>
          <span class="favorite ${favorite ? "active" : ""}" data-favorite="${escapeHtml(product.id)}" role="button" tabindex="0" aria-label="Favoritar">${favorite ? "♥" : "♡"}</span>
          ${productVisual(product)}
        </div>
        <div class="product-info">
          <small>${escapeHtml(categoryLabel(product.category))}</small>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="price-row"><div>${product.compareAtPrice ? `<del>${money.format(product.compareAtPrice)}</del>` : ""}<strong>${money.format(product.price)}</strong></div>${discount ? `<span class="discount">-${discount}%</span>` : ""}</div>
          <span class="add-button">Escolher tamanho</span>
        </div>
      </button>
    </article>`;
  }).join("");
}

function render() {
  renderCategories();
  renderProducts();
  renderCart();
}

function openProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  state.selectedProduct = product;
  state.selectedSize = product.variants[0]?.size || "";
  state.selectedQuantity = 1;
  const variants = product.variants.length
    ? product.variants.map((variant) => `<button type="button" class="size-option ${state.selectedSize === variant.size ? "active" : ""}" data-size="${escapeHtml(variant.size)}">${escapeHtml(variant.size)}</button>`).join("")
    : `<span class="stock-warning">Tamanhos indisponíveis</span>`;
  $("product-modal-content").innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-image tone-${escapeHtml(product.tone)}">${productVisual(product)}</div>
      <div class="product-detail-info">
        <span class="section-kicker">${escapeHtml(categoryLabel(product.category))}</span>
        <h2 id="product-modal-title">${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
        <div class="detail-price">${product.compareAtPrice ? `<del>${money.format(product.compareAtPrice)}</del>` : ""}<strong>${money.format(product.price)}</strong></div>
        <div class="option-block"><span class="option-title">Escolha o tamanho</span><div id="size-options" class="size-options">${variants}</div></div>
        <label class="field personalization-field"><span>Personalização opcional</span><input id="personalization" maxlength="28" placeholder="Ex.: LUIS 10"><small>Nome e número, conforme disponibilidade do produto.</small></label>
        <div class="detail-actions"><div class="quantity-control"><button type="button" data-quantity="-1">−</button><strong id="detail-quantity">1</strong><button type="button" data-quantity="1">+</button></div><button id="add-selected-product" class="primary-button" ${product.variants.length ? "" : "disabled"}>Adicionar ao carrinho</button></div>
      </div>
    </div>`;
  openModal("product-modal");
}

function addSelectedProduct() {
  const product = state.selectedProduct;
  if (!product || !state.selectedSize) {
    showToast("Escolha um tamanho para continuar.", "error");
    return;
  }
  const personalization = $("personalization")?.value.trim() || "";
  const existing = state.cart.find((item) => item.productId === product.id && item.size === state.selectedSize && item.personalization === personalization);
  if (existing) existing.quantity += state.selectedQuantity;
  else state.cart.push({
    productId: product.id,
    name: product.name,
    sku: product.sku,
    size: state.selectedSize,
    quantity: state.selectedQuantity,
    personalization,
    price: product.price,
    imageUrl: product.imageUrl,
    tone: product.tone
  });
  persist();
  closeModal("product-modal");
  renderCart();
  openCart();
  showToast("Manto adicionado ao carrinho.", "success");
}

function cartCount() {
  return state.cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function cartTotal() {
  return state.cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

function renderCart() {
  const badge = $("cart-badge");
  const count = cartCount();
  badge.textContent = count;
  badge.classList.toggle("hidden", !count);
  $("cart-total").textContent = money.format(cartTotal());
  $("checkout-total").textContent = money.format(cartTotal());
  $("go-checkout").disabled = !state.cart.length;
  const content = $("cart-content");
  if (!state.cart.length) {
    content.className = "cart-empty";
    content.innerHTML = "<span>◫</span><strong>Seu carrinho está vazio</strong><p>Escolha um manto e o tamanho para continuar.</p>";
    return;
  }
  content.className = "cart-items";
  content.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-thumb tone-${escapeHtml(item.tone || "gold")}">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : escapeHtml(item.sku?.slice(-2) || "MS")}</div>
      <div><strong>${escapeHtml(item.name)}</strong><small>Tamanho ${escapeHtml(item.size)}${item.personalization ? ` · ${escapeHtml(item.personalization)}` : ""}</small><span>${money.format(Number(item.price) * Number(item.quantity))}</span><div class="cart-quantity"><button data-cart-quantity="${index}" data-delta="-1">−</button><b>${item.quantity}</b><button data-cart-quantity="${index}" data-delta="1">+</button></div></div>
      <button data-remove="${index}" aria-label="Remover">×</button>
    </div>`).join("");
}

function openCart() {
  $("drawer-backdrop").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  $("drawer-backdrop").classList.add("hidden");
  if ([...document.querySelectorAll(".modal-backdrop")].every((element) => element.classList.contains("hidden"))) document.body.style.overflow = "";
}

function openCheckout() {
  if (!state.cart.length) return;
  closeCart();
  $("checkout-error").classList.add("hidden");
  const profile = readStorage("manto:profile", {});
  Object.entries(profile).forEach(([key, value]) => {
    const field = $("checkout-form").elements.namedItem(key);
    if (field) field.value = value;
  });
  renderCart();
  openModal("checkout-modal");
}

function formPayload(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value).trim()]));
}

function validateCheckout(data) {
  if (data.name.length < 3) return "Informe o nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return "Informe um e-mail válido.";
  if (data.phone.replace(/\D/g, "").length < 10) return "Informe um telefone válido.";
  if (data.postalCode.replace(/\D/g, "").length !== 8) return "Informe um CEP com 8 números.";
  if (!data.street || !data.number || !data.neighborhood || !data.city) return "Complete o endereço de entrega.";
  if (!/^[A-Za-z]{2}$/.test(data.state)) return "Informe a UF com duas letras.";
  return "";
}

function createLocalOrder(data) {
  const now = new Date();
  const number = `MS-${now.getFullYear()}-${String(Date.now()).slice(-6)}`;
  return {
    number,
    status: "AWAITING_PAYMENT",
    paymentStatus: "PENDING",
    subtotal: cartTotal(), shippingAmount: 0, discountAmount: 0, total: cartTotal(),
    createdAt: now.toISOString(), updatedAt: now.toISOString(), trackingCode: null, trackingCarrier: null,
    shippedAt: null, deliveredAt: null, email: data.email,
    items: state.cart.map((item) => ({ productName: item.name, size: item.size, quantity: item.quantity, personalization: item.personalization || null })),
    events: [{ status: "AWAITING_PAYMENT", note: "Pedido criado no modo de demonstração.", createdAt: now.toISOString() }],
    demo: true
  };
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formPayload(form);
  const validationError = validateCheckout(data);
  const errorBox = $("checkout-error");
  if (validationError) {
    errorBox.textContent = validationError;
    errorBox.classList.remove("hidden");
    return;
  }
  errorBox.classList.add("hidden");
  const button = $("submit-order");
  button.disabled = true;
  button.textContent = "Criando pedido...";
  const request = {
    customer: { name: data.name, email: data.email.toLowerCase(), phone: data.phone },
    shipping: {
      street: data.street, number: data.number, complement: data.complement || undefined,
      neighborhood: data.neighborhood, city: data.city, state: data.state.toUpperCase(), postalCode: data.postalCode
    },
    items: state.cart.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity, personalization: item.personalization || undefined }))
  };
  try {
    let order;
    if (state.apiOnline) {
      order = await apiRequest("/v1/orders", { method: "POST", body: JSON.stringify(request) });
      order = { ...order, email: request.customer.email, items: state.cart.map((item) => ({ productName: item.name, size: item.size, quantity: item.quantity, personalization: item.personalization || null })), events: [] };
    } else {
      order = createLocalOrder(data);
    }
    localStorage.setItem("manto:profile", JSON.stringify(data));
    state.localOrders.unshift(order);
    state.cart = [];
    persist();
    renderCart();
    closeModal("checkout-modal");
    showOrderSuccess(order);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Criar pedido";
  }
}

function showOrderSuccess(order) {
  $("success-content").innerHTML = `
    <div class="order-number"><small>Número do pedido</small><strong>${escapeHtml(order.number)}</strong></div>
    <div class="success-summary"><span>Status <b>${escapeHtml(STATUS_LABELS[order.status] || order.status)}</b></span><span>Total <b>${money.format(Number(order.total))}</b></span></div>
    ${order.demo ? `<p class="demo-note">Pedido salvo neste aparelho em modo de demonstração. Ele se tornará um pedido real quando a API do Cloud Run for conectada.</p>` : `<p>Guarde o número do pedido. O pagamento será liberado na próxima etapa da implantação.</p>`}`;
  $("success-track").dataset.number = order.number;
  $("success-track").dataset.email = order.email;
  openModal("success-modal");
}

function renderRecentOrders() {
  const container = $("recent-orders");
  if (!state.localOrders.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `<div class="recent-heading"><span class="section-kicker">NESTE APARELHO</span><h3>Pedidos recentes</h3></div>${state.localOrders.slice(0, 5).map((order) => `
    <button class="recent-order" data-recent-order="${escapeHtml(order.number)}" data-order-email="${escapeHtml(order.email || "")}">
      <span><strong>${escapeHtml(order.number)}</strong><small>${dateTime.format(new Date(order.createdAt))}</small></span>
      <span><b>${money.format(Number(order.total))}</b><small>${escapeHtml(STATUS_LABELS[order.status] || order.status)}</small></span>
    </button>`).join("")}`;
}

function openOrders(number = "", email = "") {
  closeModal("success-modal");
  const form = $("tracking-form");
  form.elements.namedItem("number").value = number;
  form.elements.namedItem("email").value = email;
  $("tracking-result").innerHTML = "";
  $("tracking-error").classList.add("hidden");
  renderRecentOrders();
  openModal("orders-modal");
  if (number && email) form.requestSubmit();
}

function renderTracking(order) {
  const events = Array.isArray(order.events) ? order.events : [];
  $("tracking-result").innerHTML = `
    <article class="tracking-card">
      <div class="tracking-head"><div><small>Pedido</small><h3>${escapeHtml(order.number)}</h3></div><span class="status-pill status-${escapeHtml(order.status.toLowerCase())}">${escapeHtml(STATUS_LABELS[order.status] || order.status)}</span></div>
      <div class="tracking-summary"><span><small>Pagamento</small><strong>${escapeHtml(PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus)}</strong></span><span><small>Total</small><strong>${money.format(Number(order.total))}</strong></span>${order.trackingCode ? `<span><small>Rastreio</small><strong>${escapeHtml(order.trackingCode)}</strong></span>` : ""}</div>
      <div class="tracking-items">${(order.items || []).map((item) => `<div><span>${item.quantity}× ${escapeHtml(item.productName)}</span><small>Tamanho ${escapeHtml(item.size)}${item.personalization ? ` · ${escapeHtml(item.personalization)}` : ""}</small></div>`).join("")}</div>
      ${events.length ? `<ol class="timeline">${events.map((item) => `<li><span></span><div><strong>${escapeHtml(STATUS_LABELS[item.status] || item.status)}</strong><small>${dateTime.format(new Date(item.createdAt))}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small></div></li>`).join("")}</ol>` : ""}
    </article>`;
}

async function trackOrder(event) {
  event.preventDefault();
  const data = formPayload(event.currentTarget);
  const number = data.number.toUpperCase();
  const email = data.email.toLowerCase();
  const error = $("tracking-error");
  error.classList.add("hidden");
  $("track-order").disabled = true;
  $("track-order").textContent = "Consultando...";
  try {
    let order;
    if (state.apiOnline) {
      order = await apiRequest(`/v1/orders/${encodeURIComponent(number)}?email=${encodeURIComponent(email)}`);
    } else {
      order = state.localOrders.find((item) => item.number.toUpperCase() === number && String(item.email).toLowerCase() === email);
      if (!order) throw new Error("Pedido não encontrado neste aparelho.");
    }
    renderTracking(order);
  } catch (requestError) {
    $("tracking-result").innerHTML = "";
    error.textContent = requestError.message;
    error.classList.remove("hidden");
  } finally {
    $("track-order").disabled = false;
    $("track-order").textContent = "Consultar";
  }
}

function bindEvents() {
  $("search").addEventListener("input", (event) => { state.query = event.target.value; renderProducts(); });
  $("clear-filters").addEventListener("click", () => { state.query = ""; state.category = "TODOS"; state.showFavorites = false; $("search").value = ""; render(); });
  $("open-cart").addEventListener("click", openCart);
  $("close-cart").addEventListener("click", closeCart);
  $("drawer-backdrop").addEventListener("click", (event) => { if (event.target === $("drawer-backdrop")) closeCart(); });
  $("go-checkout").addEventListener("click", openCheckout);
  $("checkout-form").addEventListener("submit", submitOrder);
  $("tracking-form").addEventListener("submit", trackOrder);

  ["open-orders", "desktop-orders", "mobile-orders"].forEach((id) => $(id)?.addEventListener("click", () => openOrders()));
  $("mobile-profile").addEventListener("click", () => showToast("O perfil será liberado junto com o login do cliente."));
  $("mobile-favorites").addEventListener("click", () => {
    state.showFavorites = !state.showFavorites;
    state.query = "";
    state.category = "TODOS";
    $("search").value = "";
    render();
    $("lancamentos").scrollIntoView();
  });
  $("success-track").addEventListener("click", (event) => openOrders(event.currentTarget.dataset.number, event.currentTarget.dataset.email));

  document.addEventListener("click", (event) => {
    const category = event.target.closest("[data-category]");
    if (category) { state.category = category.dataset.category; state.showFavorites = false; render(); return; }

    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      event.preventDefault();
      event.stopPropagation();
      const id = favorite.dataset.favorite;
      state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
      persist();
      renderProducts();
      return;
    }

    const product = event.target.closest("[data-product]");
    if (product) { openProduct(product.dataset.product); return; }

    const size = event.target.closest("[data-size]");
    if (size) {
      state.selectedSize = size.dataset.size;
      document.querySelectorAll("[data-size]").forEach((item) => item.classList.toggle("active", item.dataset.size === state.selectedSize));
      return;
    }

    const quantity = event.target.closest("[data-quantity]");
    if (quantity) {
      state.selectedQuantity = Math.max(1, Math.min(10, state.selectedQuantity + Number(quantity.dataset.quantity)));
      $("detail-quantity").textContent = state.selectedQuantity;
      return;
    }

    if (event.target.closest("#add-selected-product")) { addSelectedProduct(); return; }

    const cartQuantity = event.target.closest("[data-cart-quantity]");
    if (cartQuantity) {
      const index = Number(cartQuantity.dataset.cartQuantity);
      state.cart[index].quantity = Math.max(1, Math.min(10, state.cart[index].quantity + Number(cartQuantity.dataset.delta)));
      persist(); renderCart(); return;
    }

    const remove = event.target.closest("[data-remove]");
    if (remove) { state.cart.splice(Number(remove.dataset.remove), 1); persist(); renderCart(); return; }

    const recent = event.target.closest("[data-recent-order]");
    if (recent) {
      $("tracking-form").elements.namedItem("number").value = recent.dataset.recentOrder;
      $("tracking-form").elements.namedItem("email").value = recent.dataset.orderEmail;
      $("tracking-form").requestSubmit();
      return;
    }

    const close = event.target.closest("[data-close-modal]");
    if (close) { closeModal(close.dataset.closeModal); return; }

    const backdrop = event.target.classList.contains("modal-backdrop") ? event.target : null;
    if (backdrop) closeModal(backdrop.id);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeCart();
    document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((modal) => closeModal(modal.id));
  });
}

bindEvents();
renderCart();
loadCatalog();
