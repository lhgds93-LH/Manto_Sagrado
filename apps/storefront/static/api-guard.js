(() => {
  const form = document.getElementById("checkout-form");
  const errorBox = document.getElementById("checkout-error");

  if (!form || typeof submitOrder !== "function") return;

  form.removeEventListener("submit", submitOrder);
  form.addEventListener("submit", async (event) => {
    if (!state.apiOnline) {
      event.preventDefault();
      errorBox.textContent = "A loja não conseguiu se conectar ao servidor. Atualize a página e tente novamente; nenhum pedido foi criado.";
      errorBox.classList.remove("hidden");
      return;
    }

    await submitOrder(event);
  });
})();
