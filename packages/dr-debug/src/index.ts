import { DrDebug, type DrDebugOptions } from './DrDebug.js'

export { DrDebug, type DrDebugOptions }
export * from '@dr-debug/controller'
export * from '@dr-debug/core'
export * from '@dr-debug/llms'
export * from '@dr-debug/ui'

export function initDrDebug(options?: DrDebugOptions): DrDebug {
  return DrDebug.init(options)
}

