export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Servir manifest.json i sw.js directament ──────────────────
    if (path === '/manifest.json') {
      return fetch(env.ASSETS ? await env.ASSETS.fetch(request) : request);
    }

    // ── Ruta d'autenticació del PIN (POST /auth) ──────────────────
    if (path === '/auth' && request.method === 'POST') {
      const { pin } = await request.json().catch(() => ({}));
      if (pin === env.VICTOR_PIN) {
        const resp = new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
        // Cookie de sessió vàlida 8h
        resp.headers.set(
          'Set-Cookie',
          `cht_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`
        );
        return resp;
      }
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Logout ────────────────────────────────────────────────────
    if (path === '/logout') {
      const resp = new Response(null, { status: 302 });
      resp.headers.set('Location', '/');
      resp.headers.set(
        'Set-Cookie',
        'cht_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      );
      return resp;
    }

    // ── Llegir la cookie ──────────────────────────────────────────
    const cookie = request.headers.get('Cookie') || '';
    const isVictor = cookie.includes('cht_auth=1');

    // ── Servir fitxers estàtics (icons, etc.) ────────────────────
    if (path !== '/' && path !== '/index.html') {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response('Not found', { status: 404 });
    }

    // ── Llegir el HTML des dels assets ───────────────────────────
    let html = '';
    if (env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(
        new Request(new URL('/index.html', request.url))
      );
      html = await assetResp.text();
    } else {
      return new Response('Assets not configured', { status: 500 });
    }

    if (isVictor) {
      // Víctor autenticat: serveix el HTML complet
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── No autenticat: injecta la pantalla de PIN sobre el HTML ──
    // Elimina el mode Víctor del HTML i afegeix la protecció
    // La app segueix funcionant en mode entrenador sense PIN
    const protectedHtml = injectPinProtection(html);
    return new Response(protectedHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

function injectPinProtection(html) {
  // Injecta un script que intercepta el botó de Víctor
  // i fa la verificació via /auth en comptes de comparar al client
  const script = `
<script>
(function() {
  // Sobreescriu tryPin per verificar via Worker (server-side)
  window._workerPinMode = true;
  document.addEventListener('DOMContentLoaded', function() {
    // Parcheja tryPin per fer fetch a /auth
    window.tryPin = async function() {
      const input = document.getElementById('pin-input');
      const errEl = document.getElementById('pin-error');
      const pin = input.value;
      try {
        const r = await fetch('/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await r.json();
        if (data.ok) {
          // Recarrega la pàgina: ara tindrà la cookie i el Worker servirà el HTML complet
          window.location.reload();
        } else {
          errEl.textContent = 'PIN incorrecte';
          input.value = '';
          input.focus();
        }
      } catch(e) {
        errEl.textContent = 'Error de connexió';
      }
    };
  });
})();
</script>`;

  // Insereix el script just abans de </body>
  return html.replace('</body>', script + '\n</body>');
}
