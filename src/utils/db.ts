
import logger from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = global as unknown as { prisma: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

try {
    if (!globalForPrisma.prisma) {
        const { PrismaClient } = require('@prisma/client');
        globalForPrisma.prisma = new PrismaClient();
        logger.info('[db] Prisma client initialized con PostgreSQL.');
    }
    prisma = globalForPrisma.prisma;
} catch (error) {
    logger.warn('[db] Prisma client init error: %s — auth/portfolio disabled.', (error as Error).message);
    prisma = null;
}

export default prisma;
