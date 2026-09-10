// ============================================================
// Logger Utility for the Betting System
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

class Logger {
  private minLevel: LogLevel = 'info';
  private logs: LogEntry[] = [];

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    success: 1,
  };

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = {
      debug: '🔍 [DEBUG]',
      info: 'ℹ️  [INFO]',
      warn: '⚠️  [WARN]',
      error: '❌ [ERROR]',
      success: '✅ [SUCCESS]',
    }[level];

    return `${prefix} ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message));
      this.logs.push({ level: 'debug', message, timestamp: new Date().toISOString() });
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
      this.logs.push({ level: 'info', message, timestamp: new Date().toISOString() });
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
      this.logs.push({ level: 'warn', message, timestamp: new Date().toISOString() });
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
      this.logs.push({ level: 'error', message, timestamp: new Date().toISOString() });
    }
  }

  success(message: string): void {
    if (this.shouldLog('success')) {
      console.log(this.formatMessage('success', message));
      this.logs.push({ level: 'success', message, timestamp: new Date().toISOString() });
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
