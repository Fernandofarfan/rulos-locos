import prisma from '../src/utils/db';
import { decryptSecret, encryptSecret } from '../src/utils/crypto';

async function main(): Promise<void> {
    if (!prisma) throw new Error('Base de datos no disponible');
    const dryRun = process.argv.includes('--dry-run');
    let apiSecrets = 0;
    let passthroughs = 0;
    let twoFactorSecrets = 0;
    const keys = await prisma.exchangeKey.findMany();
    for (const key of keys) {
        const data: { apiSecret?: string; passthrough?: string } = {};
        if (!key.apiSecret.startsWith('v1:')) {
            data.apiSecret = encryptSecret(decryptSecret(key.apiSecret, 'base64'));
            apiSecrets++;
        }
        if (key.passthrough && !key.passthrough.startsWith('v1:')) {
            data.passthrough = encryptSecret(key.passthrough);
            passthroughs++;
        }
        if (!dryRun && Object.keys(data).length) {
            await prisma.exchangeKey.update({ where: { id: key.id }, data });
        }
    }
    const users = await prisma.user.findMany({ where: { twoFactorSecret: { not: null } } });
    for (const user of users) {
        if (user.twoFactorSecret && !user.twoFactorSecret.startsWith('v1:')) {
            twoFactorSecrets++;
            if (!dryRun) await prisma.user.update({
                where: { id: user.id }, data: { twoFactorSecret: encryptSecret(user.twoFactorSecret) },
            });
        }
    }
    console.log(`${dryRun ? 'Dry run: ' : ''}apiSecret=${apiSecrets}, passthrough=${passthroughs}, twoFactorSecret=${twoFactorSecrets}`);
}

main().catch(error => {
    console.error('Error migrando secretos:', error);
    process.exitCode = 1;
}).finally(async () => { await prisma?.$disconnect(); });
