import { PersistedAccountInfo } from '@safecoin/amman-client'
import { Keypair } from '@safecoin/web3.js'
import { promises as fs } from 'fs'
import path from 'path'
import {
  SnapshotConfig,
  SNAPSHOT_ACCOUNTS_DIR,
  SNAPSHOT_KEYPAIRS_DIR,
} from '../assets'
import { logInfo, logTrace, scopedLog } from '../utils'
import { canAccess } from '../utils/fs'
import { Account } from './types'

const { logError } = scopedLog('process-snapshot')

export async function processSnapshot(snapshotConfig: SnapshotConfig): Promise<{
  snapshotArgs: string[]
  persistedSnapshotAccountInfos: (PersistedAccountInfo & {
    label: string
    accountPath: string
  })[]
  snapshotAccounts: Account[]
  keypairs: Map<string, Keypair>
}> {
  if (snapshotConfig.load == null) {
    return {
      snapshotArgs: [],
      persistedSnapshotAccountInfos: [],
      snapshotAccounts: [],
      keypairs: new Map(),
    }
  }

  const fullPathToSnapshotDir = path.join(
    snapshotConfig.snapshotFolder,
    snapshotConfig.load
  )

  // -----------------
  // Accounts
  // -----------------
  const snapshotArgs = []
  const fullPathToAccountsDir = path.join(
    fullPathToSnapshotDir,
    SNAPSHOT_ACCOUNTS_DIR
  )
  const files = (await fs.readdir(fullPathToAccountsDir)).filter(
    (x) => path.extname(x) === '.json'
  )
  const persistedSnapshotAccountInfos = await Promise.all(
    files.map(async (x) => {
      const accountPath = path.join(fullPathToAccountsDir, x)

      const json = await fs.readFile(accountPath, 'utf8')
      const label = path.basename(x, '.json')

      const persistedAccount: PersistedAccountInfo & {
        label: string
        accountPath: string
      } = {
        ...JSON.parse(json),
        label,
        accountPath,
      }
      return persistedAccount
    })
  )

  const snapshotAccounts: Account[] = []
  for (const {
    label,
    pubkey,
    accountPath,
    account,
  } of persistedSnapshotAccountInfos) {
    logTrace(`Loading account labeled ${label} with pubkey ${pubkey}`)
    snapshotArgs.push('--account')
    snapshotArgs.push(pubkey)
    snapshotArgs.push(accountPath)
    snapshotAccounts.push({
      accountId: pubkey,
      label,
      executable: account.executable,
      cluster: 'local',
    })
  }

  // -----------------
  // Keypairs
  // -----------------
  const keypairsDir = path.join(fullPathToSnapshotDir, SNAPSHOT_KEYPAIRS_DIR)
  const keypairs: Map<string, Keypair> = (await canAccess(keypairsDir))
    ? await loadKeypairs(keypairsDir)
    : new Map()

  logInfo(
    `Loading ${persistedSnapshotAccountInfos.length} accounts and ${
      keypairs.size
    } keypairs from snapshot at ${path.relative(
      process.cwd(),
      fullPathToSnapshotDir
    )}`
  )

  return {
    snapshotArgs,
    persistedSnapshotAccountInfos,
    snapshotAccounts,
    keypairs,
  }
}

async function loadKeypairs(
  keypairsDir: string
): Promise<Map<string, Keypair>> {
  const promises = (await fs.readdir(keypairsDir))
    .filter((x) => path.extname(x) === '.json')
    .map(async function (x: string): Promise<[string, Keypair] | undefined> {
      const label = path.basename(x, '.json')
      const fullPath = path.join(keypairsDir, x)
      const src = await fs.readFile(fullPath, 'utf8')
      try {
        const json = JSON.parse(src)
        const data = Uint8Array.from(json)
        const keypair = Keypair.fromSecretKey(data)
        return [label, keypair]
      } catch (err) {
        logError(err)
        logError(`Failed to load keypair ${label}`)
        logError(src)
      }
    })
  const keypairsArr = (await Promise.all(promises)).filter((x) => x != null)
  return new Map(keypairsArr as [string, Keypair][])
}
