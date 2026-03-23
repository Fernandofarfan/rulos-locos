// Test: does node-fetch follow the 301 redirects from argentinadatos?
const fetch = require('node-fetch');

const endpoints = [
  ['inflacion (sin slash)', 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion'],
  ['inflacion (con slash)', 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion/'],
  ['riesgo-pais (sin slash)', 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'],
  ['riesgo-pais (con slash)', 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/'],
  ['cotizaciones/dolares', 'https://api.argentinadatos.com/v1/cotizaciones/dolares/'],
  ['depositos30dias', 'https://api.argentinadatos.com/v1/finanzas/tasas/depositos30dias/'],
];

(async () => {
  console.log('\n=== TEST node-fetch con redirect:follow ===\n');
  for (const [name, url] of endpoints) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        redirect: 'follow',
        timeout: 8000,
      });
      const txt = await r.text();
      let parsed;
      try { parsed = JSON.parse(txt); } catch { parsed = null; }
      const items = Array.isArray(parsed) ? parsed.length : (parsed ? 'object' : 'non-json');
      console.log(`${r.status === 200 ? '✅' : '⚠️ '} [${r.status}] ${name.padEnd(35)} → ${items} items`);
    } catch (e) {
      console.log(`❌ [ERR] ${name.padEnd(35)} → ${e.message}`);
    }
  }
  console.log();
})();
