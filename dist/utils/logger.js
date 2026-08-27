"use strict";
// ============================================================
// Simple Logger
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const currentLevel = LogLevel.INFO;
function formatTime() {
    return new Date().toISOString().slice(11, 19);
}
exports.logger = {
    debug(msg, ...args) {
        if (currentLevel <= LogLevel.DEBUG) {
            console.log(`[${formatTime()}] 🔍 ${msg}`, ...args);
        }
    },
    info(msg, ...args) {
        if (currentLevel <= LogLevel.INFO) {
            console.log(`[${formatTime()}] ℹ️  ${msg}`, ...args);
        }
    },
    warn(msg, ...args) {
        if (currentLevel <= LogLevel.WARN) {
            console.warn(`[${formatTime()}] ⚠️  ${msg}`, ...args);
        }
    },
    error(msg, ...args) {
        if (currentLevel <= LogLevel.ERROR) {
            console.error(`[${formatTime()}] ❌ ${msg}`, ...args);
        }
    },
    success(msg, ...args) {
        console.log(`[${formatTime()}] ✅ ${msg}`, ...args);
    },
};
//# sourceMappingURL=logger.js.map