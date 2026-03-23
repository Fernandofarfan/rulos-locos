import { initSentry } from './sentry';
initSentry();

import config from './config'; // Cargar env antes que nada
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import logger from './utils/logger';
import arbitrageWorker from './workers/arbitrageWorker';
import alertWorker from './workers/alertWorker';
import marketWorker from './workers/marketWorker';
import './utils/telegramBot'; // Iniciar el demonio bot
import prisma from './utils/db';

logger.info('--- INICIANDO SERVIDOR RULOS LOCOS ---');

const httpServer = http.createServer(app);

// Inicializar Socket.io
export const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'https://rulos-locos.vercel.app'],
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    logger.info('🔗 Cliente conectado a WebSockets: %s', socket.id);
    socket.on('disconnect', () => {
        logger.info('❌ Cliente desconectado: %s', socket.id);
    });
});

const PORT = Number(config.PORT) || 3001;
const server = httpServer.listen(PORT, '127.0.0.1', () => {
    logger.info(`🚀 Servidor y WebSockets corriendo en http://127.0.0.1:${PORT}`);
    logger.info(`📝 Ambiente: ${config.NODE_ENV}`);
    logger.info(`🔑 Google Client ID cargado: ${process.env.GOOGLE_CLIENT_ID ? 'SÍ' : 'NO'}`);
    arbitrageWorker.start(io);
    alertWorker.start();
    marketWorker.start(io);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.warn('📍 Recibida señal de terminación: %s', signal);
    
    try {
        // Detener aceptar nuevas conexiones
        server.close(async () => {
            logger.info('✓ Servidor HTTP cerrado');
            
            // Desconectar BD
            await prisma.$disconnect();
            logger.info('✓ Conexión a BD cerrada');
            
            // Desconectar Socket.io
            io.disconnectSockets();
            logger.info('✓ WebSockets desconectados');
            
            process.exit(0);
        });

        // Timeout de 30 segundos para forzar salida
        setTimeout(() => {
            logger.error('⚠ Timeout de shutdown — forzando salida');
            process.exit(1);
        }, 30000);
    } catch (error) {
        logger.error('❌ Error durante shutdown graceful', error);
        process.exit(1);
    }
};

// Listeners para señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log de errores no capturados
process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('❌ Unhandled Rejection', reason);
    process.exit(1);
});
