/**
 * Declaraciones de tipo mínimas para paquetes sin @types oficiales instalados.
 * Cuando se instalen @types/compression y @types/nodemailer, este archivo puede eliminarse.
 */

declare module 'compression' {
    import { RequestHandler } from 'express';
    function compression(options?: {
        threshold?: number | string;
        level?: number;
        memLevel?: number;
        strategy?: number;
        filter?: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => boolean;
        [key: string]: unknown;
    }): RequestHandler;
    export = compression;
}

declare module 'nodemailer' {
    namespace nodemailer {
        interface SendMailOptions {
            from?: string;
            to: string | string[];
            subject?: string;
            text?: string;
            html?: string;
            [key: string]: unknown;
        }

        interface SentMessageInfo {
            messageId: string;
            [key: string]: unknown;
        }

        interface Transporter {
            sendMail(mailOptions: SendMailOptions): Promise<SentMessageInfo>;
            verify(): Promise<true>;
        }

        interface TransportOptions {
            host?: string;
            port?: number;
            secure?: boolean;
            auth?: { user: string; pass: string };
            [key: string]: unknown;
        }

        function createTransport(options: TransportOptions | string): Transporter;
        function createTransport(transport: unknown, defaults?: unknown): Transporter;
    }

    export = nodemailer;
}
