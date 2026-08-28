export declare class FloatingPill {
    private element;
    private badgeText;
    private equalizer;
    private isDragging;
    private startX;
    private startY;
    private initialX;
    private initialY;
    private hasMoved;
    constructor(onClick: () => void);
    getElement(): HTMLElement;
    updateStatus(errorCount: number, failedNetCount?: number, slowNetCount?: number, isRunning?: boolean): void;
    private initDraggable;
}
//# sourceMappingURL=FloatingPill.d.ts.map