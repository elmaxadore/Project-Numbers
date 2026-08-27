import { SystemConfig } from './models/types.js';
export declare const CONFIG: SystemConfig;
/**
 * Validate that critical config is present
 */
export declare function validateConfig(): {
    valid: boolean;
    missing: string[];
};
//# sourceMappingURL=config.d.ts.map