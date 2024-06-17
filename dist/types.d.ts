/// <reference types="node" />
import type { Account, Address, CurrencyCollection } from "@ton/core";
import type { tonNode_blockIdExt } from "./schema";
export type BlockLookupIDRequest = {
    seqno: number;
    shard: string;
    workchain: number;
    mode: 'id';
};
export type BlockLookupUtimeRequest = {
    shard: string;
    workchain: number;
    mode: 'utime';
    utime: number;
};
export type BlockLookupLtRequest = {
    shard: string;
    workchain: number;
    mode: 'lt';
    lt: bigint;
};
export type BlockLookupRequest = BlockLookupIDRequest | BlockLookupUtimeRequest | BlockLookupLtRequest;
export type CacheMap = {
    get(key: any): any | void;
    set(key: any, value: any): any;
    delete(key: any): any;
    clear(): any;
};
export interface AccountsDataLoaderKey {
    seqno: number;
    shard: string;
    workchain: number;
    rootHash: Buffer;
    fileHash: Buffer;
    address: Address;
}
export interface BlockID {
    seqno: number;
    shard: string;
    workchain: number;
    rootHash: Buffer;
    fileHash: Buffer;
}
export interface ClientAccountState {
    state: Account | null;
    lastTx: {
        lt: bigint;
        hash: bigint;
    } | null;
    balance: CurrencyCollection;
    raw: Buffer;
    proof: Buffer;
    block: tonNode_blockIdExt;
    shardBlock: tonNode_blockIdExt;
    shardProof: Buffer;
}
export interface QueryArgs {
    timeout?: number;
    awaitSeqno?: number;
}
export type AllShardsResponse = {
    id: tonNode_blockIdExt;
    shards: {
        [key: string]: {
            [key: string]: number;
        };
    };
    raw: Buffer;
    proof: Buffer;
};
