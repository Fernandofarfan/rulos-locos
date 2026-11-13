const API = location.origin + '/api';
async function load() {
    try {
        const res = await fetch(API + '/arbitrage');
        const data = await res.json();
        const d = data.dolares || {};
        const widget = document.getElementById('widget');
        widget.innerHTML = '';
        const items = [
            { name: 'Blue', cls: 'blue', price: d.blue?.venta },
            { name: 'MEP', cls: 'mep', price: d.mep?.venta },
            { name: 'CCL', cls: 'ccl', price: d.ccl?.venta },
        ];
        items.forEach(item => {
            if (!item.price) return;
            const card = document.createElement('div');
            card.className = `card ${item.cls}`;
            card.innerHTML = `
                <div class="label">Dólar ${item.name}</div>
                <div class="price">$${Math.round(item.price).toLocaleString('es-AR')}</div>
            `;
            widget.appendChild(card);
        });
    } catch {
        const loading = document.getElementById('loading');
        if (loading) loading.textContent = 'Error cargando datos';
    }
}
load();
setInterval(load, 60000);
