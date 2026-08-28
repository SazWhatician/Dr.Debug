import type { NetworkRecord } from '../types.js';
export declare class NetworkInterceptor {
    private records;
    private maxRecords;
    private isInstalled;
    private originalFetch?;
    private originalXHROpen?;
    private originalXHRSend?;
    private originalXHRSetRequestHeader?;
    constructor(maxRecords?: number);
    init(): void;
    private parseFetchArgs;
    private normalizeHeaders;
    private serializeBody;
    private extractResponseBody;
    private detectCORSError;
    private hookXHR;
    private pushRecord;
    getRecords(): NetworkRecord[];
    getFailed(): NetworkRecord[];
    getSlow(): NetworkRecord[];
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=network.d.ts.map