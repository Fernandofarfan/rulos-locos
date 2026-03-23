import winston from 'winston';
import path from 'path';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
    ),
    defaultMeta: { service: 'rulos-locos' },
    transports: [],
});

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

if (!isProduction) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
        ),
    }));
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
    }));
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
    }));
} else {
    logger.add(new winston.transports.Console({
        format: winston.format.json(),
    }));
}

export default logger;
