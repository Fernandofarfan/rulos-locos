import fs from 'fs';
import path from 'path';
import logger from './logger';
import prisma from './db';
import type { ArbitrageResult } from '../services/arbitrageService';

export interface SpreadPoint {
    time: string;
    value: number;
    timestamp: number;
}

const DATA_DIR = path.join(__dirname, '../../data');
const HISTORY_FILE = path.join(DATA_DIR, 'spread-history.json');
const MAX_POINTS = 200;

let _history: SpreadPoint[] = [];
let _saveScheduled = false;
let loadPromise: Promise<void> | undefined;
let lastPrune = 0;

function ensureDataDir(): void {
    if (process.env.NODE_ENV === 'production') return; // Filesystem read-only en Vercel
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    } catch (err) {
        // Silencioso: No es crítico si falla (Vercel es read-only)
        logger.debug('Failed to ensure data dir:', (err as Error).message);
    }
}

function scheduleSave(): void {
    if (_saveScheduled) return;
    _saveScheduled = true;
    const timer = setTimeout(() => {
        _saveScheduled = false;
        persistToDisk();
    }, 2000);
    timer.unref();
}

function persistToDisk(): void {
    if (process.env.NODE_ENV === 'production') return; // Filesystem read-only en Vercel
    try {
        ensureDataDir();
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(_history), 'utf8');
    } catch (err) {
        logger.error('spreadHistory: error al guardar en disco: %s', (err as Error).message);
    }
}

export function load(): SpreadPoint[] {
    if (process.env.NODE_ENV === 'production') return (_history = []); // Sin disco en Vercel
    try {
        ensureDataDir();
        if (!fs.existsSync(HISTORY_FILE)) return (_history = []);
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return (_history = []);
        const raw_points = (parsed as SpreadPoint[])
            .filter((p) => p && typeof p.timestamp === 'number')
            .sort((a, b) => a.timestamp - b.timestamp);
        // Deduplicate: keep only strictly ascending timestamps
        _history = [];
        for (const p of raw_points) {
            const last = _history[_history.length - 1];
            if (!last || p.timestamp > last.timestamp) {
                _history.push(p);
            }
        }
        _history = _history.slice(-MAX_POINTS);
        logger.info('spreadHistory: cargados %d puntos desde disco', _history.length);
        return _history;
    } catch (err) {
        logger.warn('spreadHistory: no se pudo cargar del disco (%s), arrancando vacío', (err as Error).message);
        return (_history = []);
    }
}

export function getAll(): SpreadPoint[] {
    return _history;
}

export function ensureLoaded(): Promise<void> {
    if (!loadPromise) {
        loadPromise = (async () => {
            if (!prisma) { load(); return; }
            try {
                const points = await prisma.spreadPoint.findMany({ orderBy: { timestamp: 'desc' }, take: MAX_POINTS });
                _history = points.reverse().map((point: { timestamp: Date; value: number }) => ({
                    timestamp: point.timestamp.getTime(), value: point.value,
                    time: point.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }));
            } catch (error) {
                logger.warn('spreadHistory: error cargando historial: %s', (error as Error).message);
                loadPromise = undefined;
            }
        })();
    }
    return loadPromise;
}

export async function append(point: SpreadPoint): Promise<void> {
    if (!point || typeof point.timestamp !== 'number') return;

    const last = _history[_history.length - 1];
    // Strictly ascending: reject if timestamp is not greater than the last one
    if (last && point.timestamp <= last.timestamp) return;
    if (last && point.timestamp - last.timestamp < 60_000) return;

    _history.push(point);
    if (_history.length > MAX_POINTS) _history.shift();
    if (!prisma) { scheduleSave(); return; }
    try {
        await prisma.spreadPoint.createMany({
            data: [{ timestamp: new Date(point.timestamp), value: point.value }],
            skipDuplicates: true,
        });
        if (Date.now() - lastPrune > 24 * 60 * 60 * 1000) {
            lastPrune = Date.now();
            await prisma.spreadPoint.deleteMany({ where: { timestamp: { lt: new Date(Date.now() - 30 * 86400_000) } } });
        }
    } catch (error) {
        logger.warn('spreadHistory: error guardando historial: %s', (error as Error).message);
    }
}

export async function appendResult(result: ArbitrageResult): Promise<void> {
    const blueBid = Number(result.dolares?.blue?.compra);
    const mepAsk = Number(result.dolares?.mep?.venta);
    if (blueBid > 0 && mepAsk > 0) {
        const now = new Date();
        await append({
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: Number((((blueBid / mepAsk) - 1) * 100).toFixed(2)),
            timestamp: now.getTime(),
        });
    }
}
