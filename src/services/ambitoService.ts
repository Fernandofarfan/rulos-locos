import fetch from 'node-fetch';

class AmbitoService {
    getRisk(): number {
        // Datos mockeados por estabilidad — Ambito requiere headless browser
        return 519; // valor realista Feb 2026
    }
}

export default new AmbitoService();
