import { Request, Response } from 'express';
import dolarApiService from '../services/dolarApiService';
import cache from '../utils/cache';
import cryptoYaService from '../services/cryptoYaService';

/**
 * GET /api/og-image — Returns a dynamic SVG for social sharing.
 * When shared on WhatsApp/Twitter, shows current Blue price.
 */
export async function getOGImage(req: Request, res: Response) {
    try {
        const types: Record<string, { casa: string; name: string }> = {
            blue: { casa: 'blue', name: 'Blue' }, mep: { casa: 'bolsa', name: 'MEP' },
            ccl: { casa: 'contadoconliqui', name: 'CCL' }, oficial: { casa: 'oficial', name: 'Oficial' },
            cripto: { casa: 'cripto', name: 'Cripto' },
        };
        const type = typeof req.query.type === 'string' ? req.query.type : 'blue';
        if (!Object.prototype.hasOwnProperty.call(types, type)) { res.status(400).send('Tipo inválido'); return; }
        const cacheKey = `og_image_svg_${type}`;
        const cached = await cache.get<string>(cacheKey);
        if (cached) {
            res.type('image/svg+xml').send(cached);
            return;
        }

        const quote = type === 'cripto' ? await cryptoYaService.getBinanceP2P() : null;
        const dolares = quote ? [] : await dolarApiService.getAllDollars();
        const dollar = dolares.find(d => d.casa === types[type].casa);
        const price = quote?.totalAsk ?? dollar?.venta;
        const source = quote?.source ?? dollar?.source ?? 'estimado';
        const estimated = quote?.isEstimated ?? dollar?.isEstimated ?? true;
        const bluePrice = price && Number.isFinite(price) ? `$${Math.round(price).toLocaleString('es-AR')}` : '$—';
        const date = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0e14"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
  <text x="600" y="200" text-anchor="middle" font-family="system-ui" font-size="32" font-weight="700" fill="#64748b">⚡ RULOS LOCOS</text>
  <text x="600" y="310" text-anchor="middle" font-family="monospace" font-size="120" font-weight="900" fill="white">${bluePrice}</text>
  <text x="600" y="380" text-anchor="middle" font-family="system-ui" font-size="28" fill="#3b82f6" font-weight="600">Dólar ${types[type].name} · ${date}</text>
  <text x="600" y="430" text-anchor="middle" font-family="system-ui" font-size="20" fill="#94a3b8">Fuente: ${estimated ? 'estimado' : source.replace(/[<>&"']/g, '')}</text>
  <text x="600" y="560" text-anchor="middle" font-family="system-ui" font-size="18" fill="#334155">rulos-locos.vercel.app · Dashboard Financiero Argentino</text>
</svg>`;

        cache.set(cacheKey, svg, 5 * 60 * 1000); // 5 min cache
        res.type('image/svg+xml').send(svg);
    } catch {
        res.status(500).send('Error generating OG image');
    }
}
