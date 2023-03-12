import * as AmmanClient from '@safecoin/amman-client'

export { tmpLedgerDir } from './utils'
export { Change } from './accounts/state'
export * from './types'

// -----------------
// Forwarding some amman-client exports
// -----------------
export {
  AmmanAccountRendererMap,
  LOCALHOST,
} from '@safecoin/amman-client'

/**
 * @deprecated Use from _amman-client_ directly via `import { Amman } from '@safecoin/amman-client'`
 */
export const Amman = AmmanClient.Amman
