import { useEffect } from 'react';

/**
 * Hook para registrar keyboard shortcuts globales.
 *
 * Registra Alt+1..6 para navegar entre secciones,
 * Ctrl+K para abrir el modal de atajos,
 * Ctrl+P para exportar PDF,
 * y G+letra para navegación estilo Vim.
 */

const SECTION_IDS = [
  'dashboard',    // Alt+1
  'mercado',      // Alt+2
  'arbitrage',    // Alt+3
  'herramientas', // Alt+4
  'charts',       // Alt+5
  'portfolio',    // Alt+6
];

const G_NAV: Record<string, string> = {
  d: 'dashboard', m: 'mercado', a: 'arbitrage',
  h: 'herramientas', c: 'charts', p: 'portfolio', n: 'news',
};

interface UseKeyboardShortcutsOptions {
  /** Ejecutado cuando se presiona Escape */
  onEscape?: () => void;
  /** Ejecutado cuando se presiona Ctrl+K */
  onSearch?: () => void;
  /** Ejecutado cuando se presiona Ctrl+P */
  onPDF?: () => void;
}

export function useKeyboardShortcuts({ onEscape, onSearch, onPDF }: UseKeyboardShortcutsOptions = {}) {
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Escape → callback externo
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Ctrl+K → modal de atajos
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Ctrl+P → exportar PDF
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        onPDF?.();
        return;
      }

      // Alt+1..6 → scroll a sección
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const idx = parseInt(e.key, 10);
        if (idx >= 1 && idx <= SECTION_IDS.length) {
          e.preventDefault();
          const el = document.getElementById(SECTION_IDS[idx - 1]);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      // G + letra → navegación estilo Vim
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed) {
        const sectionId = G_NAV[e.key];
        if (sectionId) {
          e.preventDefault();
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        gPressed = false;
        clearTimeout(gTimeout);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [onEscape, onSearch, onPDF]);
}

// Lista de atajos para mostrar en el modal
export const SHORTCUT_LIST: Array<{ keys: string[]; description: string }> = [
  { keys: ['Alt', '1-6'], description: 'Navegar entre secciones' },
  { keys: ['Ctrl', 'K'], description: 'Ver atajos de teclado' },
  { keys: ['Ctrl', 'P'], description: 'Exportar PDF' },
  { keys: ['G', 'D'], description: 'Ir a Dashboard' },
  { keys: ['G', 'M'], description: 'Ir a Mercado' },
  { keys: ['G', 'A'], description: 'Ir a Arbitraje' },
  { keys: ['G', 'H'], description: 'Ir a Herramientas' },
  { keys: ['G', 'C'], description: 'Ir a Gráficos' },
  { keys: ['G', 'P'], description: 'Ir a Portfolio' },
  { keys: ['Esc'], description: 'Cerrar modal actual' },
];



