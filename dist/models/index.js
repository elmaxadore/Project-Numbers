"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAGUE_XG_ADJUSTMENTS = exports.KNOWN_LEAGUES = void 0;
__exportStar(require("./types.js"), exports);
var leagues_js_1 = require("./leagues.js");
Object.defineProperty(exports, "KNOWN_LEAGUES", { enumerable: true, get: function () { return leagues_js_1.KNOWN_LEAGUES; } });
Object.defineProperty(exports, "LEAGUE_XG_ADJUSTMENTS", { enumerable: true, get: function () { return leagues_js_1.LEAGUE_XG_ADJUSTMENTS; } });
//# sourceMappingURL=index.js.map