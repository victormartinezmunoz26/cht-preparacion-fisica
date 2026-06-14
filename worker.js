export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Autenticació PIN (POST /auth) ─────────────────────────────
    if (path === '/auth' && request.method === 'POST') {
      const { pin } = await request.json().catch(() => ({}));
      if (pin === env.VICTOR_PIN) {
        const resp = new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
        resp.headers.set(
          'Set-Cookie',
          'cht_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800'
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

    // ── Fitxers estàtics (manifest.json, sw.js, icons...) ────────
    if (path !== '/' && path !== '/index.html') {
      return env.ASSETS.fetch(request);
    }

    // ── Llegir cookie ─────────────────────────────────────────────
    const cookie = request.headers.get('Cookie') || '';
    const isVictor = cookie.includes('cht_auth=1');

    // ── Llegir index.html ─────────────────────────────────────────
    const htmlResp = await env.ASSETS.fetch(
      new Request(new URL('/index.html', request.url))
    );
    const html = await htmlResp.text();

    // ── Víctor autenticat: HTML complet ───────────────────────────
    if (isVictor) {
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── No autenticat: PIN es verifica al servidor ────────────────
    const protectedHtml = html.replace('</body>', `
<script>
window.addEventListener('DOMContentLoaded', function() {
  window.tryPin = async function() {
    const input = document.getElementById('pin-input');
    const errEl = document.getElementById('pin-error');
    try {
      const r = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: input.value })
      });
      const data = await r.json();
      if (data.ok) {
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
</script>
</body>`);

    return new Response(protectedHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
