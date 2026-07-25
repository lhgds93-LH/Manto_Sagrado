"use client";

import { useMemo, useState } from "react";

const categories = [
  "Todos",
  "Brasileirão",
  "Internacionais",
  "Seleções",
  "Retrô",
  "Infantil",
  "Feminina",
];

const products = [
  {
    id: "MS-001",
    name: "Camisa Aurora 2026",
    category: "Brasileirão",
    price: 149.9,
    oldPrice: 179.9,
    badge: "Lançamento",
    tone: "gold",
  },
  {
    id: "MS-002",
    name: "Camisa Imperial Away",
    category: "Internacionais",
    price: 159.9,
    oldPrice: 189.9,
    badge: "Mais vendido",
    tone: "white",
  },
  {
    id: "MS-003",
    name: "Camisa Seleção Clássica",
    category: "Seleções",
    price: 139.9,
    oldPrice: 169.9,
    badge: "Retrô",
    tone: "green",
  },
  {
    id: "MS-004",
    name: "Camisa Eclipse Player",
    category: "Internacionais",
    price: 179.9,
    oldPrice: 209.9,
    badge: "Versão jogador",
    tone: "blue",
  },
  {
    id: "MS-005",
    name: "Kit Pequeno Craque",
    category: "Infantil",
    price: 129.9,
    oldPrice: 149.9,
    badge: "Infantil",
    tone: "red",
  },
  {
    id: "MS-006",
    name: "Camisa Lendária 1999",
    category: "Retrô",
    price: 169.9,
    oldPrice: 199.9,
    badge: "Edição especial",
    tone: "black",
  },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [favorites, setFavorites] = useState(() => new Set());
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Todos" || product.category === activeCategory;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        `${product.name} ${product.category} ${product.badge}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, query]);

  const cartTotal = cart.reduce((total, item) => total + item.price, 0);

  function toggleFavorite(productId) {
    setFavorites((current) => {
      const next = new Set(current);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  }

  function addToCart(product) {
    setCart((current) => [...current, product]);
    setCartOpen(true);
  }

  function removeFromCart(index) {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Manto Sagrado - início">
          <span className="brand-shield" aria-hidden="true">
            MS
          </span>
          <span>
            <strong>Manto Sagrado</strong>
            <small>Futebol é paixão. O manto é sagrado.</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navegação principal">
          <a href="#lancamentos">Lançamentos</a>
          <a href="#categorias">Categorias</a>
          <a href="#beneficios">Benefícios</a>
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Notificações">
            ♢
          </button>
          <button
            className="icon-button cart-button"
            type="button"
            aria-label={`Carrinho com ${cart.length} itens`}
            onClick={() => setCartOpen(true)}
          >
            ◫
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </button>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-content">
          <span className="eyebrow">COLEÇÃO 2026</span>
          <h1>Seu time.<br />Seu manto.</h1>
          <p>
            Camisas selecionadas, personalização e uma experiência de compra
            segura do pedido ao rastreamento.
          </p>
          <a className="primary-button" href="#lancamentos">
            Ver lançamentos <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="hero-ring" />
          <span className="hero-shirt">10</span>
          <span className="hero-label">MANTO<br />SAGRADO</span>
        </div>
      </section>

      <section className="search-section" aria-label="Busca de produtos">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque por times, seleções ou produtos"
            aria-label="Busque por times, seleções ou produtos"
          />
        </label>
      </section>

      <section className="category-section" id="categorias">
        <div className="section-heading">
          <div>
            <span className="section-kicker">EXPLORE</span>
            <h2>Categorias</h2>
          </div>
        </div>
        <div className="category-list" role="list" aria-label="Categorias">
          {categories.map((category) => (
            <button
              className={activeCategory === category ? "category active" : "category"}
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              <span className="category-icon" aria-hidden="true">
                {category === "Todos" ? "✦" : "◈"}
              </span>
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="products-section" id="lancamentos">
        <div className="section-heading">
          <div>
            <span className="section-kicker">ESCOLHIDOS PARA VOCÊ</span>
            <h2>{query ? "Resultados" : "Lançamentos"}</h2>
          </div>
          <span className="result-count">
            {visibleProducts.length} {visibleProducts.length === 1 ? "produto" : "produtos"}
          </span>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product) => {
              const favorite = favorites.has(product.id);
              const discount = Math.round(
                ((product.oldPrice - product.price) / product.oldPrice) * 100,
              );

              return (
                <article className="product-card" key={product.id}>
                  <div className={`product-image tone-${product.tone}`}>
                    <span className="product-badge">{product.badge}</span>
                    <button
                      className={favorite ? "favorite active" : "favorite"}
                      type="button"
                      aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      aria-pressed={favorite}
                      onClick={() => toggleFavorite(product.id)}
                    >
                      {favorite ? "♥" : "♡"}
                    </button>
                    <div className="shirt" aria-hidden="true">
                      <span>{product.id.slice(-2)}</span>
                    </div>
                  </div>
                  <div className="product-info">
                    <small>{product.category}</small>
                    <h3>{product.name}</h3>
                    <div className="price-row">
                      <div>
                        <del>{money.format(product.oldPrice)}</del>
                        <strong>{money.format(product.price)}</strong>
                      </div>
                      <span className="discount">-{discount}%</span>
                    </div>
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(product)}
                    >
                      Adicionar ao carrinho
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>Nenhum manto encontrado</h3>
            <p>Tente outro termo ou escolha a categoria “Todos”.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("Todos");
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      <section className="benefits" id="beneficios">
        <article>
          <span aria-hidden="true">◆</span>
          <div>
            <strong>Compra protegida</strong>
            <small>Pagamento seguro e acompanhamento do pedido</small>
          </div>
        </article>
        <article>
          <span aria-hidden="true">✦</span>
          <div>
            <strong>Personalize seu manto</strong>
            <small>Nome, número e opções configuráveis por produto</small>
          </div>
        </article>
        <article>
          <span aria-hidden="true">◎</span>
          <div>
            <strong>Rastreio fácil</strong>
            <small>Código e atualizações disponíveis na área de pedidos</small>
          </div>
        </article>
      </section>

      <footer className="footer">
        <span className="brand-shield small" aria-hidden="true">MS</span>
        <div>
          <strong>Manto Sagrado</strong>
          <p>Loja brasileira de camisas e artigos esportivos.</p>
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Navegação inferior">
        <a className="active" href="#inicio"><span>⌂</span>Início</a>
        <a href="#categorias"><span>▦</span>Categorias</a>
        <button type="button" onClick={() => setActiveCategory("Todos")}>
          <span>♡</span>Favoritos
        </button>
        <button type="button"><span>▤</span>Pedidos</button>
        <button type="button"><span>○</span>Perfil</button>
      </nav>

      {cartOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Seu carrinho"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="section-kicker">SUA SACOLA</span>
                <h2>Carrinho</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">×</button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span aria-hidden="true">◫</span>
                <strong>Seu carrinho está vazio</strong>
                <p>Adicione um produto para continuar.</p>
              </div>
            ) : (
              <div className="cart-items">
                {cart.map((item, index) => (
                  <div className="cart-item" key={`${item.id}-${index}`}>
                    <div className={`cart-thumb tone-${item.tone}`} aria-hidden="true">10</div>
                    <div>
                      <strong>{item.name}</strong>
                      <small>Tamanho a selecionar</small>
                      <span>{money.format(item.price)}</span>
                    </div>
                    <button type="button" onClick={() => removeFromCart(index)} aria-label={`Remover ${item.name}`}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{money.format(cartTotal)}</strong></div>
              <small>Frete e descontos serão calculados no checkout.</small>
              <button className="primary-button full" type="button" disabled={cart.length === 0}>
                Continuar para o checkout
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
