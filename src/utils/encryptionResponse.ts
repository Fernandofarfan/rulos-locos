import { Response } from 'express';
import { EncryptionUnavailableError } from './crypto';

export function respondEncryptionUnavailable(error: unknown, res: Response): boolean {
    if (!(error instanceof EncryptionUnavailableError)) return false;
    res.status(503).json({ error: error.message });
    return true;
}
