import {
  Amman,
  isValidPublicKeyAddress,
} from '@safecoin/amman-client'
import { logTrace } from '../../utils'

export function cliAmmanInstance() {
  return Amman.instance({
    ammanClientOpts: { autoUnref: false, ack: true },
  })
}

export function maybeAmmanInstance() {
  try {
    return Amman.instance({
      ammanClientOpts: { autoUnref: false, ack: true },
    })
  } catch (_) {
    logTrace('Amman instance not connected')
  }
}

export async function resolveAccountAddresses(
  amman: Amman,
  acc: string
): Promise<string[]> {
  if (isValidPublicKeyAddress(acc)) return [acc]
  const resolved = await amman.addr.resolveRemoteLabel(acc)
  return resolved
}
