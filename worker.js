export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path !== '/' && path !== '/index.html') {
      return env.ASSETS.fetch(request);
    }

    const htmlResp = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    const html = await htmlResp.text();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
