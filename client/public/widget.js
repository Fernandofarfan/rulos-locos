const API = location.origin + '/api';
const params = new URLSearchParams(location.search);
const type = params.get('type');
if (params.get('theme') === 'light') document.body.classList.add('light');
async function load() {
    try {
        const res = await fetch(API + '/arbitrage');
        if (!res.ok) throw new Error('Datos no disponibles');
        const data = await res.json();
        const d = data.dolares || {};
        if (!type || type === 'cripto') {
            try {
                const response = await fetch(API + '/rate');
                if (response.ok) {
                    const rate = await response.json();
                    d.cripto = { venta: rate.ask, source: rate.source, isEstimated: rate.isEstimated, fechaActualizacion: rate.updatedAt };
                }
            } catch { /* El resto de las cotizaciones sigue disponible. */ }
        }
        const widget = document.getElementById('widget');
        widget.innerHTML = '';
        const items = [
            { name: 'Blue', cls: 'blue', quote: d.blue },
            { name: 'MEP', cls: 'mep', quote: d.mep },
            { name: 'CCL', cls: 'ccl', quote: d.ccl },
            { name: 'Oficial', cls: 'oficial', quote: d.oficial },
            { name: 'Cripto', cls: 'cripto', quote: d.cripto },
        ];
        items.forEach(item => {
            if (type && type !== item.cls) return;
            if (!Number.isFinite(item.quote?.venta) || item.quote.venta <= 0) return;
            const card = document.createElement('div');
            card.className = `card ${item.cls}`;
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = `Dólar ${item.name}`;
            const price = document.createElement('div');
            price.className = 'price';
            price.textContent = `$${Math.round(item.quote.venta).toLocaleString('es-AR')}`;
            const provenance = document.createElement('div');
            provenance.className = 'label';
            provenance.textContent = `Fuente: ${item.quote.source || 'estimado'}${item.quote.isEstimated ? ' · Estimado' : ''} · ${item.quote.fechaActualizacion || 'sin fecha'}`;
            card.append(label, price, provenance);
            widget.appendChild(card);
        });
        if (!widget.children.length) widget.textContent = 'Cotización no disponible';
    } catch {
        const loading = document.getElementById('loading');
        if (loading) loading.textContent = 'Error cargando datos';
    }
}
load();
setInterval(load, 60000);
