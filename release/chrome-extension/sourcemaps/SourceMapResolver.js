const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_MAP = new Map();
for (let i = 0; i < BASE64_CHARS.length; i++) {
    BASE64_MAP.set(BASE64_CHARS[i], i);
}
export function decodeVLQ(str) {
    const result = [];
    let shift = 0;
    let value = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const integer = BASE64_MAP.get(char);
        if (integer === undefined)
            continue;
        const hasContinuation = (integer & 32) !== 0;
        const digit = integer & 31;
        value += digit << shift;
        if (hasContinuation) {
            shift += 5;
        }
        else {
            const isNegative = (value & 1) === 1;
            const finalValue = value >> 1;
            result.push(isNegative ? -finalValue : finalValue);
            value = 0;
            shift = 0;
        }
    }
    return result;
}
export class SourceMapResolver {
    map;
    decodedLines = [];
    constructor(rawMap) {
        this.map = typeof rawMap === 'string' ? JSON.parse(rawMap) : rawMap;
        this.parseMappings();
    }
    parseMappings() {
        const lines = this.map.mappings.split(';');
        let sourceIndex = 0;
        let originalLine = 0;
        let originalColumn = 0;
        let nameIndex = 0;
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const lineStr = lines[lineIdx];
            const segments = [];
            let generatedColumn = 0;
            if (lineStr.length > 0) {
                const rawSegments = lineStr.split(',');
                for (const rawSeg of rawSegments) {
                    if (!rawSeg)
                        continue;
                    const decoded = decodeVLQ(rawSeg);
                    if (decoded.length === 0)
                        continue;
                    generatedColumn += decoded[0];
                    const seg = { generatedColumn };
                    if (decoded.length >= 4) {
                        sourceIndex += decoded[1];
                        originalLine += decoded[2];
                        originalColumn += decoded[3];
                        seg.sourceIndex = sourceIndex;
                        seg.originalLine = originalLine;
                        seg.originalColumn = originalColumn;
                    }
                    if (decoded.length >= 5) {
                        nameIndex += decoded[4];
                        seg.nameIndex = nameIndex;
                    }
                    segments.push(seg);
                }
            }
            this.decodedLines.push(segments);
        }
    }
    findOriginalPosition(line, column) {
        const zeroLine = line - 1;
        if (zeroLine < 0 || zeroLine >= this.decodedLines.length) {
            return { source: null, line: null, column: null, name: null };
        }
        const segments = this.decodedLines[zeroLine];
        if (!segments || segments.length === 0) {
            return { source: null, line: null, column: null, name: null };
        }
        // Binary search for closest segment on this line
        let left = 0;
        let right = segments.length - 1;
        let bestSegment = null;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const seg = segments[mid];
            if (seg.generatedColumn <= column) {
                bestSegment = seg;
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        if (!bestSegment || bestSegment.sourceIndex === undefined) {
            return { source: null, line: null, column: null, name: null };
        }
        const sourceName = this.map.sources[bestSegment.sourceIndex] || null;
        const origLine = bestSegment.originalLine !== undefined ? bestSegment.originalLine + 1 : null;
        const origCol = bestSegment.originalColumn !== undefined ? bestSegment.originalColumn : null;
        const name = bestSegment.nameIndex !== undefined && this.map.names ? this.map.names[bestSegment.nameIndex] : null;
        return {
            source: sourceName,
            line: origLine,
            column: origCol,
            name
        };
    }
    demangleStack(stackTrace) {
        const lines = stackTrace.split('\n');
        const frameRegex = /^(.*?\bat\s+(?:(.*?)\s+\()?)(?:https?:\/\/[^\/]+)?(.*?):(\d+):(\d+)\)?$/;
        return lines
            .map((line) => {
            const match = line.match(frameRegex);
            if (!match)
                return line;
            const prefix = match[1];
            const fnName = match[2];
            const filePath = match[3];
            const genLine = parseInt(match[4], 10);
            const genCol = parseInt(match[5], 10);
            const original = this.findOriginalPosition(genLine, genCol);
            if (original.source && original.line) {
                const resolvedName = original.name || fnName || 'anonymous';
                return `    at ${resolvedName} (${original.source}:${original.line}:${original.column ?? 0})`;
            }
            return line;
        })
            .join('\n');
    }
}
//# sourceMappingURL=SourceMapResolver.js.map