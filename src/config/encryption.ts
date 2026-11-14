export function parseEncryptionKeys(raw: string | undefined, currentId: string | undefined): Record<string, string> {
    if (!raw && !currentId) return {};
    if (!raw || !currentId || !/^[a-zA-Z0-9_-]{1,32}$/.test(currentId)) throw new Error('Configuración de claves inválida');
    const keys: Record<string, string> = Object.create(null);
    for (const entry of raw.split(',')) {
        const parts = entry.split(':');
        if (parts.length !== 2 || !/^[a-zA-Z0-9_-]{1,32}$/.test(parts[0]) ||
            !/^[0-9a-fA-F]{64}$/.test(parts[1]) || keys[parts[0]]) throw new Error('Configuración de claves inválida');
        keys[parts[0]] = parts[1];
    }
    if (!keys[currentId]) throw new Error('Identificador de clave actual desconocido');
    return keys;
}
