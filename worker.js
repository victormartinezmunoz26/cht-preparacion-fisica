export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Auth PIN ──────────────────────────────────────────────────
    if (path === '/auth' && request.method === 'POST') {
      const { pin } = await request.json().catch(() => ({}));
      if (pin === env.VICTOR_PIN) {
        const resp = new Response(null, { status: 302 });
        resp.headers.set('Location', '/');
        resp.headers.set('Set-Cookie', 'cht_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');
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
      resp.headers.set('Set-Cookie', 'cht_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
      return resp;
    }

    // ── Fitxers estàtics ──────────────────────────────────────────
    if (path !== '/' && path !== '/index.html') {
      return env.ASSETS.fetch(request);
    }

    // ── Cookie ────────────────────────────────────────────────────
    const cookie = request.headers.get('Cookie') || '';
    const isVictor = cookie.includes('cht_auth=1');

    // ── HTML ──────────────────────────────────────────────────────
    const htmlResp = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    const html = await htmlResp.text();

    // Injecta si Víctor està autenticat com a atribut del body
    const finalHtml = html.replace('<body>', `<body data-victor="${isVictor ? '1' : '0'}">`);

    return new Response(finalHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
