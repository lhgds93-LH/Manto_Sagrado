(() => {
  const nativeFetch = window.fetch.bind(window);
  const runtimeConfigBody = 'window.MANTO_CONFIG = { apiUrl: "/api" };';

  window.fetch = (input, init) => {
    const rawUrl = typeof input === "string" ? input : input?.url;

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl, window.location.origin);

        if (parsed.pathname === "/runtime-config.js") {
          return Promise.resolve(new Response(runtimeConfigBody, {
            status: 200,
            headers: {
              "content-type": "text/javascript; charset=utf-8",
              "cache-control": "no-store"
            }
          }));
        }

        if (parsed.hostname.endsWith(".run.app") && parsed.pathname.startsWith("/v1/")) {
          return nativeFetch(`/api${parsed.pathname}${parsed.search}`, init);
        }
      } catch {
        // Mantém o comportamento normal para URLs inválidas ou relativas não reconhecidas.
      }
    }

    return nativeFetch(input, init);
  };

  window.MANTO_BUILD = "2026-07-26-api-proxy-v2";
})();
