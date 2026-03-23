import React from 'react';
import { useCallback, useRef } from 'react';

const DB_NAME = 'rulos-locos-offline';
const STORE_NAME = 'cache';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
    });
}

async function idbSet<T>(key: string, data: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ data, timestamp: Date.now() }, key);
        tx.oncomplete = () => resolve();
    });
}

/**
 * useOfflineCache — Caches API data in IndexedDB for offline access.
 */
export function useOfflineCache<T>(key: string) {
    const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

    const getCached = useCallback(async (): Promise<{ data: T; timestamp: number } | null> => {
        if (typeof indexedDB === 'undefined') return null;
        try {
            const cached = await idbGet<T>(key);
            cacheRef.current = cached;
            return cached;
        } catch {
            return null;
        }
    }, [key]);

    const setCached = useCallback(async (data: T): Promise<void> => {
        if (typeof indexedDB === 'undefined') return;
        try {
            await idbSet(key, data);
            cacheRef.current = { data, timestamp: Date.now() };
        } catch { /* ignore */ }
    }, [key]);

    const getAge = useCallback((): string => {
        if (!cacheRef.current) return 'Sin datos';
        const minutes = Math.floor((Date.now() - cacheRef.current.timestamp) / 60000);
        if (minutes < 1) return 'Hace menos de 1 min';
        if (minutes < 60) return `Hace ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `Hace ${hours}h`;
    }, []);

    return { getCached, setCached, getAge };
}

/** OfflineIndicator — Shows when data is from cache. */
export const OfflineIndicator: React.FC<{ age: string; isOnline: boolean }> = ({ age, isOnline }) => {
    if (isOnline) return null;
    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600/90 text-white text-center text-xs py-1 font-bold">
            📡 Sin conexión — Datos offline ({age})
        </div>
    );
};
