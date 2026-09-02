export interface ExtensionMessage {
    type: string;
    payload?: any;
    tabId?: number;
}
export declare class BackgroundWorker {
    private tabPorts;
    private readSettings;
    /**
     * Builds the client here in the worker so the API key never crosses into page
     * context, and so the request is not subject to the page's CSP.
     */
    private resolveClient;
    handleMessage(message: ExtensionMessage, sender: {
        tab?: {
            id?: number;
        };
    }, sendResponse: (response?: any) => void): boolean;
}
//# sourceMappingURL=background.d.ts.map