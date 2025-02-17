import {
  Amman,
  isValidSolanaAddress,
  LOCALHOST,
} from '@safecoin/amman-client'
import { Commitment, Connection, PublicKey } from '@safecoin/web3.js'
import { strict as assert } from 'assert'
import path from 'path'
import { commitments, logDebug, logInfo } from '../../utils'
import { keypairFromFile } from '../../utils/fs'

export async function handleAirdropCommand(
  pubKeyOrPathToKeypairFile: string,
  amount: number,
  label: string,
  commitment: Commitment
) {
  let keystring = pubKeyOrPathToKeypairFile

  if (!isValidSolanaAddress(pubKeyOrPathToKeypairFile)) {
    logDebug(`Resolving public key from file: ${pubKeyOrPathToKeypairFile}`)
    assert(
      path.extname(pubKeyOrPathToKeypairFile) === '.json',
      'Argument to airdrop needs to be a PublicKey string or a path to a keypair JSON file'
    )

    const fullPath = path.resolve(pubKeyOrPathToKeypairFile)
    const keypair = await keypairFromFile(fullPath)
    keystring = keypair.publicKey.toBase58()
  }

  const connection = new Connection(LOCALHOST, commitment)
  const amman = Amman.instance({
    ammanClientOpts: { autoUnref: false, ack: true },
  })

  amman.addr.addLabel(label, keystring)

  logInfo(
    `Airdropping ${amount} Sol to account '${keystring}' labeled '${label}'`
  )
  await amman.airdrop(connection, new PublicKey(keystring), amount)
  return { connection }
}

export function airdropHelp() {
  return `
Airdrops provided Sol to the provided public key.

  Usage:
    amman airdrop <amount> <public key or path to keypair file>

  Options:
    --commitment=${commitments.join('|')} [default: singleGossip]
      The commitment to use for Airdrop transaction

  Examples:
    amman airdrop DTTTQyKBNPDFa3cHfFJwDWcNPRJgemSisyWaohFbMRPi 100
    amman airdrop ./keypairs/payer.json 100
`
}
