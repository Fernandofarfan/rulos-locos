
import logger from './logger';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient | null;

try {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
        logger.info('[db] Prisma client initialized con PostgreSQL.');
    }
    prisma = globalForPrisma.prisma;
} catch (error) {
    logger.warn('[db] Prisma client init error: %s — auth/portfolio disabled.', (error as Error).message);
    prisma = null;
}

export default prisma;
