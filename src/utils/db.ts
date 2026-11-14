
import logger from './logger';
import { PrismaClient } from '@prisma/client';
import '../config';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const databaseConfigured = /^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '');

let prisma: PrismaClient | null;

try {
    if (!databaseConfigured) {
        logger.warn('[db] DATABASE_URL no configurada o no es PostgreSQL; auth y portfolio deshabilitados.');
        prisma = null;
    } else {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = new PrismaClient();
            logger.info('[db] Prisma client initialized con PostgreSQL.');
        }
        prisma = globalForPrisma.prisma;
    }
} catch (error) {
    logger.warn('[db] Prisma client init error: %s — auth/portfolio disabled.', (error as Error).message);
    prisma = null;
}

export default prisma;
