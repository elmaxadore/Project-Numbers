type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';
interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
}
declare class Logger {
    private minLevel;
    private logs;
    private levelPriority;
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatMessage;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    success(message: string): void;
    getLogs(): LogEntry[];
    clear(): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map