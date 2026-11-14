import prisma from '../src/utils/db';
import { decryptSecret, encryptSecret, isCurrentEncryption } from '../src/utils/crypto';

async function main(): Promise<void> {
    if (!prisma) throw new Error('Base de datos no disponible');
    const dryRun = process.argv.includes('--dry-run');
    let apiSecrets = 0;
    let passthroughs = 0;
    let twoFactorSecrets = 0;
    const keys = await prisma.exchangeKey.findMany();
    for (const key of keys) {
        const data: { apiSecret?: string; passthrough?: string } = {};
        if (!isCurrentEncryption(key.apiSecret)) {
            data.apiSecret = encryptSecret(decryptSecret(key.apiSecret, 'base64'));
            apiSecrets++;
        }
        if (key.passthrough && !isCurrentEncryption(key.passthrough)) {
            data.passthrough = encryptSecret(decryptSecret(key.passthrough, 'plain'));
            passthroughs++;
        }
        if (!dryRun && Object.keys(data).length) {
            await prisma.exchangeKey.update({ where: { id: key.id }, data });
        }
    }
    const users = await prisma.user.findMany({ where: { twoFactorSecret: { not: null } } });
    for (const user of users) {
        if (user.twoFactorSecret && !isCurrentEncryption(user.twoFactorSecret)) {
            twoFactorSecrets++;
            if (!dryRun) await prisma.user.update({
                where: { id: user.id }, data: { twoFactorSecret: encryptSecret(decryptSecret(user.twoFactorSecret, 'plain')) },
            });
        }
    }
    console.log(`${dryRun ? 'Dry run: ' : ''}apiSecret=${apiSecrets}, passthrough=${passthroughs}, twoFactorSecret=${twoFactorSecrets}`);
}

main().catch(error => {
    console.error('Error migrando secretos:', error);
    process.exitCode = 1;
}).finally(async () => { await prisma?.$disconnect(); });
