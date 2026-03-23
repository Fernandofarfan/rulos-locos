const axios = require('axios');

async function checkApiHealth() {
    console.log('--- Verificando Salud de APIs Externas ---');

    console.log('\n[1] Verificando DolarAPI...');
    try {
        const start = Date.now();
        const res = await axios.get('https://dolarapi.com/v1/dolares');
        const duration = Date.now() - start;
        console.log(`✅ DolarAPI OK (${duration}ms) - Items: ${res.data.length}`);
    } catch (error) {
        console.error('❌ DolarAPI FAILED:', error.message);
    }

    console.log('\n[2] Verificando CriptoYa (Binance P2P)...');
    try {
        const start = Date.now();
        // Endpoint structure: https://criptoya.com/api/{exchange}/{coin}/{fiat}/{amount}
        const res = await axios.get('https://criptoya.com/api/binancep2p/USDT/ARS/1');
        const duration = Date.now() - start;
        console.log(`✅ CriptoYa OK (${duration}ms) - Ask: ${res.data.ask} / Bid: ${res.data.bid}`);
    } catch (error) {
        console.error('❌ CriptoYa FAILED:', error.message);
    }

    console.log('\n[3] Verificando ArgentinaDatos...');
    try {
        const start = Date.now();
        // A common endpoint might be /finanzas/indices/riesgo-pais if exists, checking documentation or config usage.
        // Assuming base is OK to ping or a known endpoint.
        // In economicsController.js it uses argentinaDatosService. 
        // Let's try to list something generic or check if root responds.
        const res = await axios.get('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais');
         const duration = Date.now() - start;
        console.log(`✅ ArgentinaDatos OK (${duration}ms)`);
    } catch (error) {
         // Fallback check if specific endpoint fails
         try {
            const res = await axios.get('https://api.argentinadatos.com/v1/cotizaciones/dolares');
            console.log(`✅ ArgentinaDatos (Alternative) OK`);
         } catch(e) {
            console.error('❌ ArgentinaDatos FAILED:', error.message);
         }
    }
}

checkApiHealth();
