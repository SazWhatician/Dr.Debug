export interface RawSourceMap {
    version: number;
    sources: string[];
    sourcesContent?: string[];
    names?: string[];
    mappings: string;
    file?: string;
    sourceRoot?: string;
}
export interface OriginalPosition {
    source: string | null;
    line: number | null;
    column: number | null;
    name: string | null;
}
export interface DecodedSegment {
    generatedColumn: number;
    sourceIndex?: number;
    originalLine?: number;
    originalColumn?: number;
    nameIndex?: number;
}
export declare function decodeVLQ(str: string): number[];
export declare class SourceMapResolver {
    private map;
    private decodedLines;
    constructor(rawMap: RawSourceMap | string);
    private parseMappings;
    findOriginalPosition(line: number, column: number): OriginalPosition;
    demangleStack(stackTrace: string): string;
}
//# sourceMappingURL=SourceMapResolver.d.ts.map