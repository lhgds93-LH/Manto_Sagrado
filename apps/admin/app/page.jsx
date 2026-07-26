"use client";

import { useEffect, useMemo, useState } from "react";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const STATUS_LABELS = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento confirmado",
  SENT_TO_PARTNER: "Solicitação enviada",
  TRACKING_RECEIVED: "Rastreio recebido",
  SHIPPED: "Pedido enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

const PAYMENT_LABELS = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REFUSED: "Recusado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Contestado",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "Sem status";
}

function statusClass(status) {
  return String(status || "unknown").toLowerCase().replaceAll("_", "-");
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message;
    throw new Error(Array.isArray(message) ? message.join(" ") : message || "Não foi possível concluir a operação.");
  }
  return body;
}

export default function AdminPage() {
  const [session, setSession] = useState("checking");
  const [orders, setOrders] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [template, setTemplate] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [carrier, setCarrier] = useState("Correios");

  async function adminRequest(path, options = {}) {
    const response = await fetch(`/api/admin/${path}`, {
      ...options,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(options.headers || {}) },
    });
    if (response.status === 401) {
      setSession("anonymous");
      throw new Error("Sua sessão expirou. Entre novamente.");
    }
    return readJson(response);
  }

  async function loadOrders(preferredNumber = "") {
    setLoading(true);
    setError("");
    try {
      const data = await adminRequest("orders");
      const nextOrders = Array.isArray(data) ? data : [];
      setOrders(nextOrders);
      setSelectedNumber((current) => {
        const candidate = preferredNumber || current;
        return nextOrders.some((order) => order.number === candidate)
          ? candidate
          : nextOrders[0]?.number || "";
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!active) return;
        if (!response.ok) {
          setSession("anonymous");
          return;
        }
        setSession("authenticated");
        await loadOrders();
      } catch {
        if (active) setSession("anonymous");
      }
    })();
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return orders;
    return orders.filter((order) => [
      order.number,
      order.customerName,
      order.customerEmail,
      order.shippingCity,
      order.shippingState,
      statusLabel(order.status),
    ].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(term)));
  }, [orders, query]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.number === selectedNumber) || orders[0] || null,
    [orders, selectedNumber],
  );

  const metrics = useMemo(() => ({
    awaiting: orders.filter((order) => order.status === "AWAITING_PAYMENT").length,
    paid: orders.filter((order) => order.status === "PAID").length,
    preparing: orders.filter((order) => order.status === "SENT_TO_PARTNER").length,
    tracked: orders.filter((order) => ["TRACKING_RECEIVED", "SHIPPED", "DELIVERED"].includes(order.status)).length,
  }), [orders]);

  function replaceOrder(updated) {
    setOrders((current) => current.map((order) => order.number === updated.number ? updated : order));
    setSelectedNumber(updated.number);
  }

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") || "");
    setAction("login");
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      await readJson(response);
      form.reset();
      setSession("authenticated");
      await loadOrders();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setAction("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setOrders([]);
    setSelectedNumber("");
    setTemplate("");
    setSession("anonymous");
  }

  async function runOrderAction(name, path, options = {}) {
    if (!selectedOrder) return;
    setAction(name);
    setError("");
    setNotice("");
    try {
      const updated = await adminRequest(path, options);
      replaceOrder(updated);
      setNotice(name === "payment" ? "Pagamento confirmado." : name === "sent" ? "Solicitação marcada como enviada." : "Rastreio cadastrado.");
      return updated;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setAction("");
    }
  }

  async function confirmPayment() {
    await runOrderAction("payment", `orders/${selectedOrder.number}/payment-approved`, { method: "PATCH" });
  }

  async function loadTemplate(copy = false) {
    if (!selectedOrder) return "";
    setAction("template");
    setError("");
    try {
      const data = await adminRequest(`orders/${selectedOrder.number}/template`);
      const value = String(data?.template || "");
      setTemplate(value);
      if (copy && value) {
        await navigator.clipboard.writeText(value);
        setNotice("Template copiado.");
      }
      return value;
    } catch (requestError) {
      setError(requestError.message);
      return "";
    } finally {
      setAction("");
    }
  }

  async function markSent() {
    const updated = await runOrderAction("sent", `orders/${selectedOrder.number}/sent`, { method: "PATCH" });
    if (updated) await loadTemplate(false);
  }

  async function openWhatsApp() {
    const value = template || await loadTemplate(false);
    if (value) window.open(`https://wa.me/?text=${encodeURIComponent(value)}`, "_blank", "noopener,noreferrer");
  }

  async function saveTracking(event) {
    event.preventDefault();
    const code = trackingCode.trim().toUpperCase();
    if (!code) {
      setError("Informe o código de rastreio.");
      return;
    }
    const updated = await runOrderAction("tracking", `orders/${selectedOrder.number}/tracking`, {
      method: "PATCH",
      body: JSON.stringify({ trackingCode: code, carrier: carrier.trim() || "Transportadora" }),
    });
    if (updated) setTrackingCode("");
  }

  useEffect(() => {
    setTemplate("");
    setTrackingCode("");
    setNotice("");
    setError("");
  }, [selectedNumber]);

  if (session === "checking") {
    return <main className="auth-shell"><div className="loading-card"><span className="shield">MS</span><strong>Carregando painel seguro...</strong></div></main>;
  }

  if (session === "anonymous") {
    return (
      <main className="auth-shell">
        <section className="login-card">
          <span className="shield login-shield">MS</span>
          <span className="kicker">ACESSO RESTRITO</span>
          <h1>Painel Manto Sagrado</h1>
          <p>Entre com a senha administrativa. A chave da API permanece protegida no servidor.</p>
          <form onSubmit={login}>
            <label><span>Senha</span><input name="password" type="password" autoComplete="current-password" required autoFocus /></label>
            {error ? <div className="alert error-alert">{error}</div> : null}
            <button className="gold-button" type="submit" disabled={action === "login"}>{action === "login" ? "Entrando..." : "Entrar no painel"}</button>
          </form>
          <small>As sessões expiram automaticamente após 8 horas.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="admin-brand"><span className="shield">MS</span><span><strong>Manto Sagrado</strong><small>Painel administrativo</small></span></div>
        <nav><button className="active" type="button">▦ Pedidos</button><button type="button" disabled>◇ Produtos</button><button type="button" disabled>◎ Clientes</button><button type="button" disabled>⚙ Configurações</button></nav>
        <div className="privacy-note"><strong>Operação protegida</strong><p>Credenciais e informações internas nunca são enviadas ao navegador.</p></div>
      </aside>

      <section className="main-content">
        <header className="admin-header">
          <div><span className="kicker">OPERAÇÃO EM TEMPO REAL</span><h1>Pedidos e rastreamento</h1><p>Dados carregados diretamente do Cloud SQL.</p></div>
          <div className="header-actions"><button className="refresh-button" type="button" onClick={() => loadOrders(selectedNumber)} disabled={loading}>{loading ? "Atualizando..." : "Atualizar"}</button><button className="logout-button" type="button" onClick={logout}>Sair</button></div>
        </header>

        <section className="metrics" aria-label="Indicadores de pedidos">
          <article><span>Aguardando pagamento</span><strong>{metrics.awaiting}</strong><small>Precisam de conferência</small></article>
          <article><span>Pagamento confirmado</span><strong>{metrics.paid}</strong><small>Prontos para encaminhar</small></article>
          <article><span>Aguardando rastreio</span><strong>{metrics.preparing}</strong><small>Solicitação já enviada</small></article>
          <article><span>Com rastreio</span><strong>{metrics.tracked}</strong><small>Cliente pode acompanhar</small></article>
        </section>

        {error ? <div className="alert error-alert">{error}</div> : null}
        {notice ? <div className="alert success-alert">{notice}</div> : null}

        <div className="workspace">
          <section className="orders-panel">
            <div className="panel-heading"><div><span className="kicker">FILA ATUAL</span><h2>Pedidos</h2></div><span>{orders.length} registros</span></div>
            <div className="search-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente ou cidade" /></div>
            <div className="order-list">
              {!loading && !filteredOrders.length ? <div className="empty-panel">Nenhum pedido encontrado.</div> : null}
              {filteredOrders.map((order) => (
                <button className={selectedOrder?.number === order.number ? "order-row selected" : "order-row"} key={order.number} type="button" onClick={() => setSelectedNumber(order.number)}>
                  <span className={`status-dot status-${statusClass(order.status)}`} />
                  <span className="order-main"><strong>{order.number}</strong><small>{order.customerName} · {order.shippingCity}/{order.shippingState}</small></span>
                  <span className="order-status">{statusLabel(order.status)}</span>
                  <strong>{money.format(Number(order.total || 0))}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            {!selectedOrder ? <div className="empty-panel detail-empty">Selecione um pedido para começar.</div> : <>
              <div className="panel-heading"><div><span className="kicker">DETALHES</span><h2>{selectedOrder.number}</h2></div><span className={`status-pill status-${statusClass(selectedOrder.status)}`}>{statusLabel(selectedOrder.status)}</span></div>
              <div className="detail-grid">
                <div><small>Cliente</small><strong>{selectedOrder.customerName}</strong><span>{selectedOrder.customerEmail}<br />{selectedOrder.customerPhone}</span></div>
                <div><small>Pagamento</small><strong>{PAYMENT_LABELS[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}</strong><span>Total {money.format(Number(selectedOrder.total || 0))}</span></div>
                <div className="wide"><small>Entrega</small><strong>{selectedOrder.shippingStreet}, {selectedOrder.shippingNumber}{selectedOrder.shippingComplement ? `, ${selectedOrder.shippingComplement}` : ""}</strong><span>{selectedOrder.shippingNeighborhood} · {selectedOrder.shippingCity}/{selectedOrder.shippingState} · CEP {selectedOrder.shippingPostalCode}</span></div>
                <div><small>Criado em</small><strong>{dateTime.format(new Date(selectedOrder.createdAt))}</strong></div>
                <div><small>Rastreio</small><strong>{selectedOrder.trackingCode || "Ainda não cadastrado"}</strong><span>{selectedOrder.trackingCarrier || ""}</span></div>
              </div>

              <div className="items-card"><div className="card-title"><small>ITENS</small><strong>{selectedOrder.items?.length || 0} produto(s)</strong></div>{(selectedOrder.items || []).map((item) => <div className="item-row" key={item.id || `${item.sku}-${item.size}`}><span><strong>{item.quantity}× {item.productName}</strong><small>SKU {item.sku} · Tamanho {item.size}{item.personalization ? ` · ${item.personalization}` : ""}</small></span><strong>{money.format(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</strong></div>)}</div>

              <div className="action-card">
                <div className="card-title"><small>FLUXO OPERACIONAL</small><strong>Próxima ação</strong></div>
                <div className="action-buttons">
                  <button className="gold-button" type="button" onClick={confirmPayment} disabled={action || selectedOrder.paymentStatus === "APPROVED" || selectedOrder.status === "CANCELED"}>{selectedOrder.paymentStatus === "APPROVED" ? "Pagamento confirmado" : action === "payment" ? "Confirmando..." : "Confirmar pagamento"}</button>
                  <button className="secondary-button" type="button" onClick={() => loadTemplate(true)} disabled={action || selectedOrder.paymentStatus !== "APPROVED"}>{action === "template" ? "Gerando..." : "Copiar template"}</button>
                  <button className="secondary-button" type="button" onClick={openWhatsApp} disabled={action || selectedOrder.paymentStatus !== "APPROVED"}>Abrir no WhatsApp</button>
                  <button className="secondary-button" type="button" onClick={markSent} disabled={action || selectedOrder.paymentStatus !== "APPROVED" || Boolean(selectedOrder.sentToPartnerAt)}>{selectedOrder.sentToPartnerAt ? "Solicitação enviada" : action === "sent" ? "Salvando..." : "Marcar como enviada"}</button>
                </div>
                {template ? <pre>{template}</pre> : null}
              </div>

              <form className="tracking-form" onSubmit={saveTracking}>
                <div className="card-title"><small>RASTREAMENTO</small><strong>Cadastrar código recebido</strong></div>
                {selectedOrder.trackingCode ? <div className="tracking-success"><span>✓</span><div><small>Código cadastrado</small><strong>{selectedOrder.trackingCode}</strong><em>{selectedOrder.trackingCarrier}</em></div></div> : <div className="tracking-fields"><input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Transportadora" aria-label="Transportadora" /><input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Código de rastreio" aria-label="Código de rastreio" /><button type="submit" disabled={action || !selectedOrder.sentToPartnerAt}>{action === "tracking" ? "Salvando..." : "Salvar rastreio"}</button></div>}
              </form>
            </>}
          </section>
        </div>
      </section>
    </main>
  );
}
