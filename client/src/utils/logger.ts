/**
 * Logger simple para el frontend
 * Browser-compatible, no requiere archivos
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class BrowserLogger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private getTimestamp(): string {
    return new Date().toISOString().split('T')[1].slice(0, 8); // HH:MM:SS
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = this.getTimestamp();
    const entry: LogEntry = { level, message, data, timestamp };

    // Guardar en memoria (últimos 100 logs)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const style = this.getStyle(level);
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    
    if (data !== undefined) {
      console.log(`%c${prefix}%c ${message}`, style, '', data);
    } else {
      console.log(`%c${prefix}%c ${message}`, style, '');
    }
  }

  private getStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #999; font-weight: bold;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff9900; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold;',
    };
    return styles[level];
  }

  debug(message: string, data?: unknown) {
    if (this.isDev) this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new BrowserLogger();
