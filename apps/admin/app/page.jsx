"use client";

import { useMemo, useState } from "react";

const initialOrders = [
  {
    id: "MS-260725-8K4P",
    customer: "Cliente demonstração",
    city: "Canoas/RS",
    product: "Camisa Aurora 2026",
    size: "G",
    personalization: "LUIS 10",
    quantity: 1,
    total: 169.9,
    payment: "Pix aprovado",
    status: "PAGO",
    supplierCode: "FORN-001",
    trackingCode: "",
  },
  {
    id: "MS-260724-2J7A",
    customer: "Cliente teste",
    city: "Porto Alegre/RS",
    product: "Camisa Imperial Away",
    size: "M",
    personalization: "Sem personalização",
    quantity: 2,
    total: 319.8,
    payment: "Cartão aprovado",
    status: "ENVIADO_AO_PARCEIRO",
    supplierCode: "FORN-001",
    trackingCode: "",
  },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusLabels = {
  PAGO: "Pagamento confirmado",
  ENVIADO_AO_PARCEIRO: "Solicitação enviada",
  RASTREIO_RECEBIDO: "Rastreio cadastrado",
};

export default function AdminPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState(initialOrders[0].id);
  const [trackingInput, setTrackingInput] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedId) ?? orders[0],
    [orders, selectedId],
  );

  const template = useMemo(() => {
    if (!selectedOrder) return "";
    return [
      "NOVO PEDIDO — MANTO SAGRADO",
      `Referência interna: ${selectedOrder.id}`,
      `Produto: ${selectedOrder.product}`,
      `Tamanho: ${selectedOrder.size}`,
      `Quantidade: ${selectedOrder.quantity}`,
      `Personalização: ${selectedOrder.personalization}`,
      `Destino: ${selectedOrder.city}`,
      "Solicito confirmação e posterior envio do código de rastreio.",
    ].join("\n");
  }, [selectedOrder]);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function markAsSent() {
    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrder.id
          ? { ...order, status: "ENVIADO_AO_PARCEIRO" }
          : order,
      ),
    );
  }

  function saveTracking(event) {
    event.preventDefault();
    const code = trackingInput.trim().toUpperCase();
    if (!code) return;

    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrder.id
          ? { ...order, status: "RASTREIO_RECEBIDO", trackingCode: code }
          : order,
      ),
    );
    setTrackingInput("");
  }

  const paidCount = orders.filter((order) => order.status === "PAGO").length;
  const awaitingTracking = orders.filter((order) => order.status === "ENVIADO_AO_PARCEIRO").length;
  const tracked = orders.filter((order) => order.status === "RASTREIO_RECEBIDO").length;

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="admin-brand">
          <span className="shield">MS</span>
          <span><strong>Manto Sagrado</strong><small>Painel administrativo</small></span>
        </div>
        <nav>
          <button className="active" type="button">▦ Visão geral</button>
          <button type="button">▤ Pedidos</button>
          <button type="button">◇ Produtos</button>
          <button type="button">◎ Clientes</button>
          <button type="button">⚙ Configurações</button>
        </nav>
        <div className="privacy-note">
          <strong>Privacidade operacional</strong>
          <p>Dados do parceiro são restritos ao ambiente interno e identificados por código neutro.</p>
        </div>
      </aside>

      <section className="main-content">
        <header className="admin-header">
          <div>
            <span className="kicker">OPERAÇÃO</span>
            <h1>Pedidos e rastreamento</h1>
            <p>Gerencie o fluxo após o pagamento sem expor informações internas.</p>
          </div>
          <div className="profile"><span>LH</span><div><strong>Administrador</strong><small>Acesso total</small></div></div>
        </header>

        <section className="metrics" aria-label="Indicadores de pedidos">
          <article><span>Pagamento confirmado</span><strong>{paidCount}</strong><small>Aguardando envio da solicitação</small></article>
          <article><span>Aguardando rastreio</span><strong>{awaitingTracking}</strong><small>Solicitação já encaminhada</small></article>
          <article><span>Rastreios cadastrados</span><strong>{tracked}</strong><small>Cliente pode acompanhar o pedido</small></article>
        </section>

        <div className="workspace">
          <section className="orders-panel">
            <div className="panel-heading"><div><span className="kicker">FILA ATUAL</span><h2>Pedidos</h2></div><span>{orders.length} registros</span></div>
            <div className="order-list">
              {orders.map((order) => (
                <button
                  className={selectedId === order.id ? "order-row selected" : "order-row"}
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(order.id);
                    setTrackingInput("");
                  }}
                >
                  <span className={`status-dot status-${order.status.toLowerCase()}`} />
                  <span className="order-main"><strong>{order.id}</strong><small>{order.customer} · {order.city}</small></span>
                  <span className="order-status">{statusLabels[order.status]}</span>
                  <strong>{money.format(order.total)}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            <div className="panel-heading"><div><span className="kicker">DETALHES</span><h2>{selectedOrder.id}</h2></div><span className={`status-pill status-${selectedOrder.status.toLowerCase()}`}>{statusLabels[selectedOrder.status]}</span></div>

            <div className="detail-grid">
              <div><small>Cliente</small><strong>{selectedOrder.customer}</strong></div>
              <div><small>Pagamento</small><strong>{selectedOrder.payment}</strong></div>
              <div><small>Produto</small><strong>{selectedOrder.product}</strong></div>
              <div><small>Tamanho / quantidade</small><strong>{selectedOrder.size} · {selectedOrder.quantity} un.</strong></div>
              <div><small>Personalização</small><strong>{selectedOrder.personalization}</strong></div>
              <div><small>Código interno</small><strong>{selectedOrder.supplierCode}</strong></div>
            </div>

            <div className="template-card">
              <div className="template-heading"><div><small>MENSAGEM OPERACIONAL</small><strong>Template para WhatsApp</strong></div><button type="button" onClick={copyTemplate}>{copied ? "Copiado" : "Copiar"}</button></div>
              <pre>{template}</pre>
              <button className="gold-button" type="button" onClick={markAsSent} disabled={selectedOrder.status === "RASTREIO_RECEBIDO"}>Marcar solicitação como enviada</button>
            </div>

            <form className="tracking-form" onSubmit={saveTracking}>
              <div><small>RASTREAMENTO</small><strong>Cadastrar código recebido</strong></div>
              {selectedOrder.trackingCode ? (
                <div className="tracking-success"><span>✓</span><div><small>Código cadastrado</small><strong>{selectedOrder.trackingCode}</strong></div></div>
              ) : (
                <div className="tracking-fields">
                  <input value={trackingInput} onChange={(event) => setTrackingInput(event.target.value)} placeholder="Ex.: AB123456789BR" aria-label="Código de rastreio" />
                  <button type="submit">Salvar rastreio</button>
                </div>
              )}
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
