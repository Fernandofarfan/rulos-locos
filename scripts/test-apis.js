const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

const test = (name, url) => new Promise(r => {
  const req = https.get(url, { agent, headers: {'User-Agent':'Mozilla/5.0'}, timeout: 8000 }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r({ name, status: res.statusCode, body: d.slice(0, 100) }));
  }).on('error', e => r({ name, status: 'ERR', body: e.message.slice(0, 80) }));
  req.setTimeout(8000, () => { req.destroy(); r({ name, status: 'TIMEOUT', body: 'sin respuesta en 8s' }); });
});

Promise.all([
  test('argentinadatos › inflacion', 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion'),
  test('argentinadatos › riesgo-pais', 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'),
  test('argentinadatos › dolar/blue', 'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue'),
  test('bcra › reservas (v3)', 'https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1?offset=0&limit=1'),
  test('bcra › base monetaria(v3)', 'https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/15?offset=0&limit=1'),
  test('dolarapi › blue', 'https://dolarapi.com/v1/dolares/blue'),
  test('criptoya › usdt/ars', 'https://criptoya.com/api/usdt/ars/1'),
]).then(results => {
  console.log('\n=== DIAGNÓSTICO API ===\n');
  results.forEach(({ name, status, body }) => {
    const icon = status === 200 ? '✅' : '❌';
    console.log(`${icon} [${String(status).padEnd(7)}] ${name}`);
    if (status !== 200) console.log(`          → ${body}`);
  });
  console.log();
});
