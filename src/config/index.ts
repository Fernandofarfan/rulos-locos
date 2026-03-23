import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// ── Validación de variables de entorno al arrancar ──────────────────────────
const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRA_TOKEN: z.string().default(''),
  ARGENSTATS_KEY: z.string().default(''),
  NEWS_API_KEY: z.string().default(''),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(12).default('super_secret_key_change_me_in_production'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().default(587),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

const _env = EnvSchema.safeParse(process.env);
if (!_env.success) {
  // Mostrar errores en consola (sistema de startup)
  const errorMsg = [
    '\n⚠️  Variables de entorno inválidas:',
    ..._env.error.issues.map(i => `  • ${i.path.join('.')}: ${i.message}`),
    ''
  ].join('\n');
  process.stderr.write(errorMsg);
  // No abortamos el proceso en producción para evitar downtime; solo logueamos.
}
const env = _env.success ? _env.data : ({ ...process.env, PORT: 3001, NODE_ENV: 'development' } as any);

interface Config {
  PORT: number | string;
  NODE_ENV: string;
  CACHE_TTL: number;
  API_URLS: {
    CRIPTOYA: string;
    DOLARAPI: string;
    ARGENTINA_DATOS: string;
    BCRA_STATS: string;
    ARGENSTATS: string;
  };
  BCRA_TOKEN: string;
  ARGENSTATS_KEY: string;
  NEWS_API_KEY: string;
  CLIENT_URL: string;
  JWT_SECRET: string;
  DEFAULT_HEADERS: Record<string, string>;
  EMAIL: {
    HOST: string;
    PORT: number;
    USER?: string;
    PASS?: string;
  };
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const config: Config = {
  PORT: env.PORT || 3001,
  NODE_ENV: env.NODE_ENV || 'development',
  CACHE_TTL: 30000, // 30 segundos
  API_URLS: {
    CRIPTOYA: 'https://criptoya.com/api',
    DOLARAPI: 'https://dolarapi.com/v1',
    ARGENTINA_DATOS: 'https://api.argentinadatos.com/v1',
    BCRA_STATS: 'https://api.estadisticasbcra.com',
    ARGENSTATS: 'https://argenstats.com/api',
  },
  BCRA_TOKEN: env.BCRA_TOKEN || '',
  ARGENSTATS_KEY: env.ARGENSTATS_KEY || '',
  NEWS_API_KEY: env.NEWS_API_KEY || '',
  CLIENT_URL: env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: env.JWT_SECRET || 'super_secret_key_change_me_in_production',
  DEFAULT_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  },
  EMAIL: {
    HOST: env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: Number(env.EMAIL_PORT) || 587,
    USER: env.EMAIL_USER,
    PASS: env.EMAIL_PASS,
  },
  TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
};

export default config;
