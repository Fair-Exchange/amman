import * as AmmanClient from '@j0nnyboi/amman-client'

export { tmpLedgerDir } from './utils'
export { Change } from './accounts/state'
export * from './types'

// -----------------
// Forwarding some amman-client exports
// -----------------
export {
  AmmanAccountRendererMap,
  LOCALHOST,
} from '@j0nnyboi/amman-client'

/**
 * @deprecated Use from _amman-client_ directly via `import { Amman } from '@j0nnyboi/amman-client'`
 */
export const Amman = AmmanClient.Amman
