interface PagesEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_ORIGIN: string;
}

const escape = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

const htmlHeaders = () => ({
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://api.helpfundme.forgetechgh.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
});

export const onRequest = async ({ request, env, params }: {
  request: Request;
  env: PagesEnv;
  params: { id: string };
}): Promise<Response> => {
  const origin = new URL(request.url).origin;
  const htmlResponse = await env.ASSETS.fetch(new Request(`${origin}/index.html`));
  if (!htmlResponse.ok) return htmlResponse;
  let html = await htmlResponse.text();
  const id = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !env.API_ORIGIN) return new Response(html, { headers: htmlHeaders() });

  try {
    const apiOrigin = new URL(env.API_ORIGIN);
    if (apiOrigin.protocol !== 'https:') throw new Error('API origin must use HTTPS');
    const result = await fetch(`${apiOrigin.origin}/api/posts/${encodeURIComponent(id)}`);
    if (!result.ok) return new Response(html, { headers: htmlHeaders() });
    const { post } = await result.json() as { post?: { title: string; description: string; images?: string[] } };
    if (post) {
      const title = escape(post.title);
      const description = escape(`${String(post.description || '').replace(/\s+/g, ' ').slice(0, 150)} · HelpFundMe by Forgex Company Limited`);
      const image = escape(post.images?.[0] || `${origin}/logos.png`);
      const url = escape(`${origin}/posts/${id}`);
      html = html.replace('</head>', `<meta property="og:type" content="article" />
<meta property="og:site_name" content="HelpFundMe · Forgex Company Limited" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<link rel="canonical" href="${url}" /></head>`);
    }
  } catch {
    // A sleeping free API must not prevent the frontend route from rendering.
  }
  return new Response(html, { headers: htmlHeaders() });
};
