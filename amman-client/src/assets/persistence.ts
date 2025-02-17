import { Connection, PublicKey } from '@safecoin/web3.js'
import { strict as assert } from 'assert'
import { LOCALHOST } from '../consts'
import { scopedLog } from '../utils/log'
import { AccountDataSerializer, serializeData } from './account-data-serializer'

const { logDebug, logTrace } = scopedLog('persist')

export type PersistedAccountInfo = {
  pubkey: string
  account: {
    lamports: number
    data: [string, 'base64']
    owner: string
    executable: boolean
    rentEpoch: number
  }
}

export type PersistAccount = (
  accountInfo: PersistedAccountInfo
) => Promise<void>

export class MutableAccount<T> {
  private lamports: number
  private data: Buffer
  private owner: string
  private executable: boolean
  private rentEpoch: number

  private constructor(
    private readonly persist: PersistAccount,
    readonly pubkey: string,
    account: {
      lamports: number
      data: Buffer
      owner: string
      executable: boolean
      rentEpoch: number
    },
    private readonly serializer?: AccountDataSerializer<T>
  ) {
    this.pubkey = pubkey
    this.lamports = account.lamports
    this.data = account.data
    this.owner = account.owner
    this.executable = account.executable
    this.rentEpoch = account.rentEpoch
  }

  setOwner(owner: PublicKey) {
    logTrace('Updating owner of [%s] %s -> %s', this.owner, owner)
    this.owner = owner.toBase58()
    return this
  }

  setLamports(lamports: number) {
    logTrace(
      'Updating lamports of [%s] %d -> %d',
      this.pubkey,
      this.lamports,
      lamports
    )
    this.lamports = lamports
    return this
  }

  updateData<T>(dataUpdate: Partial<T>) {
    assert(
      this.serializer != null,
      'Account data mutator is not defined, but needed to update account data'
    )
    const des = this.serializer.deserialize(this.data)
    const state = Array.isArray(des) ? des[0] : des
    const updated = { ...state, ...dataUpdate }

    const ser = serializeData(this.serializer, updated)
    this.data = Array.isArray(ser) ? ser[0] : ser
    logTrace(
      'Updating data of [%s] to %O (%s)',
      this.pubkey,
      updated,
      this.data.toString('base64')
    )
    return this
  }

  commit() {
    const accountInfo = this._toPersistedAccountInfo()
    logDebug('Persisting account', accountInfo.pubkey)
    logTrace(accountInfo)
    return this.persist(accountInfo)
  }

  private _toPersistedAccountInfo(): PersistedAccountInfo {
    return {
      pubkey: this.pubkey,
      account: {
        lamports: this.lamports,
        data: [this.data.toString('base64'), 'base64'],
        owner: this.owner,
        executable: this.executable,
        rentEpoch: this.rentEpoch,
      },
    }
  }

  /** @private */
  static async from<T>(
    persist: PersistAccount,
    address: PublicKey,
    dataMutator?: AccountDataSerializer<T>,
    connection: Connection = new Connection(LOCALHOST, 'confirmed')
  ) {
    const accountInfo = await connection.getAccountInfo(address, 'confirmed')
    assert(
      accountInfo != null,
      `Could not find account at '${address}' and thus cannot mutate it`
    )

    return new MutableAccount(
      persist,
      address.toBase58(),
      {
        lamports: accountInfo.lamports,
        data: accountInfo.data,
        owner: accountInfo.owner.toBase58(),
        rentEpoch: accountInfo.rentEpoch ?? 0,
        executable: accountInfo.executable,
      },
      dataMutator
    )
  }
}
