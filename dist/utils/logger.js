// ============================================================
// Logger Utility for the Betting System
// ============================================================
class Logger {
    minLevel = 'info';
    logs = [];
    levelPriority = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        success: 1,
    };
    setLevel(level) {
        this.minLevel = level;
    }
    shouldLog(level) {
        return this.levelPriority[level] >= this.levelPriority[this.minLevel];
    }
    formatMessage(level, message) {
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
    debug(message) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message));
            this.logs.push({ level: 'debug', message, timestamp: new Date().toISOString() });
        }
    }
    info(message) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message));
            this.logs.push({ level: 'info', message, timestamp: new Date().toISOString() });
        }
    }
    warn(message) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message));
            this.logs.push({ level: 'warn', message, timestamp: new Date().toISOString() });
        }
    }
    error(message) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message));
            this.logs.push({ level: 'error', message, timestamp: new Date().toISOString() });
        }
    }
    success(message) {
        if (this.shouldLog('success')) {
            console.log(this.formatMessage('success', message));
            this.logs.push({ level: 'success', message, timestamp: new Date().toISOString() });
        }
    }
    getLogs() {
        return [...this.logs];
    }
    clear() {
        this.logs = [];
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map