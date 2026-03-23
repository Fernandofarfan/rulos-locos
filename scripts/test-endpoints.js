const fetch = require('node-fetch');
const tests = [
  'finanzas/tasas/depositos30dias',  
  'finanzas/tasas/badlar',
  'finanzas/tasas/plazoFijo',
  'finanzas/indices/inflacion',
  'finanzas/indices/riesgo-pais',
  'cotizaciones/dolares/blue',
  'feriados/2026',
  'finanzas/fci/mercadoDinero/ultimo',
  'monetarias/reservas',
];
(async () => {
  console.log('\n=== ArgentinaDatos endpoints ===\n');
  for (const p of tests) {
    try {
      const r = await fetch('https://api.argentinadatos.com/v1/' + p + '/', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        redirect: 'follow',
        timeout: 8000
      });
      const t = await r.text();
      let parsed; try { parsed = JSON.parse(t); } catch (e) { parsed = null; }
      const info = Array.isArray(parsed) ? parsed.length + ' items' : (parsed ? 'OK object' : 'HTML/error');
      console.log(r.status, p.padEnd(40), '->', info);
    } catch (e) {
      console.log('ERR', p.padEnd(40), '->', e.message.slice(0, 60));
    }
  }
  console.log();
})();
