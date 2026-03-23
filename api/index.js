/**
 * Entry point para Vercel Serverless Function
 * Carga el app Express compilado desde dist/app.ts
 */

let app;
let loadError = null;

// Helper para logging (no usar console.error en producción)
const logError = (message, error) => {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] ${message}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
    process.stderr.write(fullMessage + '\n');
};

try {
    const mod = require('../dist/app');
    // TypeScript default export compila a module.exports.default
    app = mod.default || mod;
    if (typeof app !== 'function') {
        throw new Error('app no exportó una función. Tipo: ' + typeof app);
    }
} catch (err) {
    loadError = err;
    logError('[api/index.js] FATAL al cargar app', err);
}

module.exports = (req, res) => {
    if (loadError) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        return res.end(JSON.stringify({
            error: 'Server initialization failed',
            message: loadError.message,
            timestamp: new Date().toISOString()
        }));
    }
    return app(req, res);
};
