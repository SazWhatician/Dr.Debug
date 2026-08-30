import type { NetworkRecord, SQLQueryCorrelation } from '../types.js'

export class SQLQueryCorrelator {
  public correlate(networkRecords: NetworkRecord[]): SQLQueryCorrelation[] {
    const correlations: SQLQueryCorrelation[] = []

    for (const req of networkRecords) {
      const serverTiming = req.responseHeaders?.['server-timing'] || req.responseHeaders?.['Server-Timing'] || ''
      const queryCountHeader = req.responseHeaders?.['x-sql-query-count'] || req.responseHeaders?.['X-Sql-Query-Count']
      const queryDurationHeader = req.responseHeaders?.['x-query-duration'] || req.responseHeaders?.['X-Query-Duration']

      const timingEntries = serverTiming
        ? serverTiming.split(',').map((s) => s.trim())
        : []

      let queryCount = queryCountHeader ? parseInt(queryCountHeader, 10) : 0
      let totalDurationMs = queryDurationHeader ? parseFloat(queryDurationHeader) : 0

      // Parse Server-Timing metric e.g. "sql;dur=142.5;desc="SELECT * FROM users""
      for (const entry of timingEntries) {
        if (entry.startsWith('sql') || entry.startsWith('db') || entry.startsWith('prisma')) {
          queryCount = queryCount || 1
          const durMatch = entry.match(/dur=([\d.]+)/)
          if (durMatch) {
            totalDurationMs = parseFloat(durMatch[1])
          }
        }
      }

      // Check N+1 query heuristic: high query count (>10 queries) or repeated endpoint calls in short succession
      const isNPlus1 = queryCount > 10 || (req.duration !== undefined && req.duration > 800 && queryCount > 5)

      if (queryCount > 0 || timingEntries.length > 0 || isNPlus1) {
        correlations.push({
          requestId: req.id,
          url: req.url,
          queryCount,
          totalQueryDurationMs: totalDurationMs,
          isNPlus1,
          serverTimingEntries: timingEntries
        })
      }
    }

    return correlations
  }
}
