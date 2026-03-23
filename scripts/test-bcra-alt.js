// Search for alternative endpoints for badlar and depositos en ArgentinaDatos
const fetch = require('node-fetch');
const candidates = [
  'finanzas/tasas/badlar',
  'finanzas/tasas/depositos30dias',
  // BCRA official alternatives 
  // v3 from bcra.gob.ar - looking for deposit rates
  // ID 6 = BADLAR bancos privados tasa nominal  
  // ID 7 = Tasa PF 30 dias (depositos)
];

(async () => {
  // Try BCRA official API for rates
  const bcraIds = [
    [6, 'BADLAR bancos privados'],
    [7, 'TM20 / PF 30 dias'],
    [27, 'Tasa pases pasivos'],
    [34, 'Tasa LELIQ'],
    [40, 'TNA PF'],
  ];
  
  console.log('\n=== BCRA oficial v3 tasas ===');
  for (const [id, name] of bcraIds) {
    try {
      const r = await fetch(`https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/${id}?offset=0&limit=3`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      const d = await r.json();
      console.log(r.status, `[ID ${id}]`.padEnd(10), name.padEnd(30), '->', JSON.stringify(d.results?.[0] || d).slice(0, 80));
    } catch (e) {
      console.log('ERR', `[ID ${id}]`, name, '->', e.message);
    }
  }
  
  // Try BCRA series for historical reservas
  console.log('\n=== BCRA v3 reservas historico ===');
  try {
    const r = await fetch('https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1?offset=0&limit=30&order=desc', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const d = await r.json();
    console.log(r.status, 'reservas 30 puntos -> items:', d.results?.length, 'ejemplo:', JSON.stringify(d.results?.[0]).slice(0, 80));
  } catch(e) { console.log('ERR reservas:', e.message); }
  
  console.log();
})();
