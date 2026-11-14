import { Router } from 'express';
import dolarApiService from '../services/dolarApiService';
import cryptoYaService from '../services/cryptoYaService';
import arbitrageService, { type ArbitrageResult } from '../services/arbitrageService';
import { calculateRoutes } from '../services/netArbitrage';
import cache from '../utils/cache';

const router = Router();
const origin = 'https://rulos-locos.vercel.app';
const pages = {
    'dolar-blue-hoy': { title: 'Dólar blue hoy', type: 'blue', casa: 'blue', description: 'Cotización de compra y venta del dólar blue en Argentina.' },
    'dolar-mep-hoy': { title: 'Dólar MEP hoy', type: 'mep', casa: 'bolsa', description: 'Consultá el dólar MEP y conocé cómo se opera mediante bonos.' },
    'dolar-ccl-hoy': { title: 'Dólar CCL hoy', type: 'ccl', casa: 'contadoconliqui', description: 'Consultá la cotización del dólar contado con liquidación.' },
    'dolar-cripto-hoy': { title: 'Dólar cripto hoy', type: 'cripto', casa: 'cripto', description: 'Consultá el precio orientativo de USDT en pesos argentinos.' },
    'dolar-oficial-hoy': { title: 'Dólar oficial hoy', type: 'oficial', casa: 'oficial', description: 'Cotización de compra y venta del dólar oficial en Argentina.' },
    'rulo-mep-cripto': { title: 'Rulo MEP cripto: rentabilidad neta', type: 'mep', casa: '', description: 'Compará rutas estimadas entre dólar MEP y USDT con comisiones de referencia.' },
    'calculadora-uva': { title: 'Calculadora de préstamos UVA', type: 'blue', casa: '', description: 'Conocé cómo se actualizan las cuotas de un préstamo UVA.' },
} as const;
type PageSlug = keyof typeof pages;
const escape = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const money = (value: number) => Number.isFinite(value) ? `$ ${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '—';

router.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...Object.keys(pages).map(path => `/${path}`)].map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
});
router.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nAllow: /api/seo/\nSitemap: ${origin}/sitemap.xml\n`);
});

router.get('/:slug', async (req, res, next) => {
    if (!Object.prototype.hasOwnProperty.call(pages, req.params.slug)) { next(); return; }
    const slug = req.params.slug as PageSlug;
    const page = pages[slug];
    let content = '';
    if (page.casa) {
        try {
            if (page.type === 'cripto') {
                const quote = await cryptoYaService.getBinanceP2P();
                content = `<p>Compra: <strong>${money(quote.totalBid)}</strong> · Venta: <strong>${money(quote.totalAsk)}</strong> por USDT</p><p>Fuente: ${escape(quote.source ?? 'estimado')}${quote.isEstimated ? ' · Estimado' : ''} · Actualización: ${escape(new Date(quote.time * 1000).toISOString())}</p>`;
            } else {
                const quote = (await dolarApiService.getAllDollars()).find(item => item.casa === page.casa);
                content = quote ? `<p>Compra: <strong>${money(quote.compra)}</strong> · Venta: <strong>${money(quote.venta)}</strong></p><p>Fuente: ${escape(quote.source ?? 'estimado')}${quote.isEstimated ? ' · Estimado' : ''} · Actualización: ${escape(quote.fechaActualizacion ?? 'sin fecha')}</p>` : '<p>Cotización no disponible.</p>';
            }
        } catch { content = '<p>Cotización temporalmente no disponible.</p>'; }
    } else if (slug === 'rulo-mep-cripto') {
        try {
            let result = await cache.get<ArbitrageResult>('arbitrage_data');
            if (!result) { result = await arbitrageService.calculateArbitrage(); cache.set('arbitrage_data', result, 60_000); }
            const routes = calculateRoutes(result, 1_000_000).filter(route => ['mep-usdt', 'usdt-mep'].includes(route.id));
            content = `<p>Capital de referencia: ${money(1_000_000)} · Fuente: estimado · Actualización: ${escape(result.timestamp)}</p>` +
                (routes.length ? `<table><thead><tr><th>Ruta</th><th>Resultado neto</th><th>Rentabilidad neta</th></tr></thead><tbody>${routes.map(route => `<tr><td>${escape(route.description)}</td><td>${money(route.net.netArs)}</td><td>${route.net.netPct.toFixed(2)}%</td></tr>`).join('')}</tbody></table>` : '<p>No hay cotizaciones suficientes.</p>') +
                '<p>Valores de referencia. La conversión USD/USDT se supone 1:1; verificá disponibilidad, comisiones, impuestos y plazos antes de operar.</p>';
        } catch { content = '<p>Rutas temporalmente no disponibles.</p>'; }
    } else {
        content = '<p>Los préstamos UVA expresan el capital en unidades que se actualizan por inflación. La cuota en pesos puede variar junto con el valor de la UVA y depende de la tasa pactada.</p><p>La simulación es orientativa y no reemplaza las condiciones de tu entidad.</p>';
    }
    const canonical = `${origin}/${slug}`;
    const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: page.title,
        description: page.description, url: canonical, inLanguage: 'es-AR' }).replace(/</g, '\\u003c');
    res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600').type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(page.title)} | Rulos Locos</title><meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(page.title)}">
<meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${origin}/api/og-image?type=${page.type}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}">
<meta name="twitter:image" content="${origin}/api/og-image?type=${page.type}"><script type="application/ld+json">${ld}</script>
<style>body{font:16px system-ui;background:#0b0e14;color:#f1f5f9;max-width:800px;margin:3rem auto;padding:0 1rem;line-height:1.6}a{color:#93c5fd}table{border-collapse:collapse}td,th{padding:.5rem;text-align:left;border-bottom:1px solid #475569}</style>
</head><body><main><h1>${escape(page.title)}</h1>${content}<p>${escape(page.description)}</p><p>Información orientativa, no constituye asesoramiento financiero.</p><p><a href="/">Abrí la aplicación y explorá todas las herramientas</a></p><nav>${Object.keys(pages).filter(key => key !== slug).map(key => `<a href="/${key}">${escape(pages[key as PageSlug].title)}</a>`).join(' · ')}</nav></main></body></html>`);
});

export default router;
