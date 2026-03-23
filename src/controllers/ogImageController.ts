import { Request, Response } from 'express';
import dolarApiService from '../services/dolarApiService';
import cache from '../utils/cache';

/**
 * GET /api/og-image — Returns a dynamic SVG for social sharing.
 * When shared on WhatsApp/Twitter, shows current Blue price.
 */
export async function getOGImage(_req: Request, res: Response) {
    try {
        const cacheKey = 'og_image_svg';
        const cached = cache.get<string>(cacheKey);
        if (cached) {
            res.type('image/svg+xml').send(cached);
            return;
        }

        const dolares = await dolarApiService.getAllDollars();
        const blue = dolares.find((d: any) => d.casa === 'blue');
        const bluePrice = blue?.venta ? `$${Math.round(blue.venta).toLocaleString('es-AR')}` : '$—';
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
  <text x="600" y="380" text-anchor="middle" font-family="system-ui" font-size="28" fill="#3b82f6" font-weight="600">Dólar Blue · ${date}</text>
  <text x="600" y="560" text-anchor="middle" font-family="system-ui" font-size="18" fill="#334155">rulos-locos.vercel.app · Dashboard Financiero Argentino</text>
</svg>`;

        cache.set(cacheKey, svg, 5 * 60 * 1000); // 5 min cache
        res.type('image/svg+xml').send(svg);
    } catch {
        res.status(500).send('Error generating OG image');
    }
}
