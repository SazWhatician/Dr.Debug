import { describe, expect, it } from 'vitest'
import { SQLQueryCorrelator } from '../src/interceptors/sqlCorrelator.js'

describe('SQLQueryCorrelator (Backend DB Query & N+1 Detection)', () => {
  it('detects N+1 query patterns and parses Server-Timing sql duration', () => {
    const correlator = new SQLQueryCorrelator()
    const records = [
      {
        id: 'req_1',
        method: 'GET',
        url: 'https://api.acme.io/users/feed',
        startTime: Date.now(),
        duration: 1200,
        responseHeaders: {
          'server-timing': 'sql;dur=650.4;desc="SELECT * FROM posts", cache;desc="miss"',
          'x-sql-query-count': '18'
        }
      }
    ]

    const results = correlator.correlate(records)
    expect(results.length).toBe(1)
    expect(results[0].isNPlus1).toBe(true)
    expect(results[0].queryCount).toBe(18)
    expect(results[0].totalQueryDurationMs).toBe(650.4)
  })
})
