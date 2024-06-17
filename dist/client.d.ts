/**
 * Copyright
 *  (c) 2022 Whales Corp.
 *  (c) 2023 TrueCarry <truecarry@gmail.com>
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />
import { Address, Contract, StateInit } from "@ton/core";
import { LiteEngine } from "./engines/engine";
import { liteServer_blockHeader, liteServer_transactionId3, tonNode_blockIdExt } from "./schema";
import { AllShardsResponse, BlockID, CacheMap, ClientAccountState, QueryArgs } from "./types";
type MapKind = 'block' | 'header' | 'shard' | 'account';
export declare class LiteClient {
    #private;
    readonly engine: LiteEngine;
    constructor(opts: {
        engine: LiteEngine;
        batchSize?: number | undefined | null;
        cacheMap?: number | ((mapKind: MapKind) => CacheMap);
    });
    /**
     * Open a contract
     * @param contract
     */
    open<T extends Contract>(contract: T): import("@ton/core").OpenedContract<T>;
    /**
     * Create a new contract provider
     * @param address
     * @param init
     */
    provider(address: Address, init?: StateInit | null): import("@ton/core").ContractProvider;
    sendMessage: (src: Buffer) => Promise<{
        status: number;
    }>;
    getMasterchainInfo: (queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_masterchainInfo>;
    getMasterchainInfoExt: (queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_masterchainInfoExt>;
    getCurrentTime: (queryArgs?: QueryArgs) => Promise<number>;
    getVersion: (queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_version>;
    getConfig: (block: BlockID, queryArgs?: QueryArgs) => Promise<import("@ton/core").MasterchainStateExtra>;
    getAccountState: (src: Address, block: BlockID) => Promise<ClientAccountState>;
    getAccountStateRaw: (src: Address, block: BlockID, queryArgs?: QueryArgs) => Promise<ClientAccountState>;
    getAccountStatePrunned: (src: Address, block: BlockID, queryArgs?: QueryArgs) => Promise<{
        stateHash: Buffer | null;
        raw: Buffer;
        proof: Buffer;
        block: tonNode_blockIdExt;
        shardBlock: tonNode_blockIdExt;
        shardProof: Buffer;
    }>;
    getAccountTransaction: (src: Address, lt: string, block: BlockID, queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_transactionInfo>;
    getAccountTransactions: (src: Address, lt: string, hash: Buffer, count: number, queryArgs?: QueryArgs) => Promise<{
        ids: tonNode_blockIdExt[];
        transactions: Buffer;
    }>;
    runMethod: (src: Address, method: string, params: Buffer, block: BlockID, queryArgs?: QueryArgs) => Promise<{
        exitCode: number;
        result: string | null;
        block: {
            seqno: number;
            shard: string;
            workchain: number;
            rootHash: Buffer;
            fileHash: Buffer;
        };
        shardBlock: {
            seqno: number;
            shard: string;
            workchain: number;
            rootHash: Buffer;
            fileHash: Buffer;
        };
    }>;
    lookupBlockByID: (block: {
        seqno: number;
        shard: string;
        workchain: number;
    }) => Promise<liteServer_blockHeader>;
    lookupBlockByUtime: (block: {
        shard: string;
        workchain: number;
        utime: number;
    }) => Promise<liteServer_blockHeader>;
    lookupBlockByLt: (block: {
        shard: string;
        workchain: number;
        lt: bigint;
    }) => Promise<liteServer_blockHeader>;
    getBlockHeader: (block: BlockID) => Promise<liteServer_blockHeader>;
    getAllShardsInfo: (block: BlockID) => Promise<AllShardsResponse>;
    listBlockTransactions: (block: BlockID, args?: {
        mode: number;
        count: number;
        after?: liteServer_transactionId3 | null | undefined;
        wantProof?: boolean;
    }, queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_blockTransactions>;
    getFullBlock: (seqno: number) => Promise<{
        shards: {
            rootHash: Buffer;
            fileHash: Buffer;
            transactions: {
                hash: Buffer;
                lt: string;
                account: Buffer;
            }[];
            workchain: number;
            seqno: number;
            shard: string;
        }[];
    }>;
    getLibraries: (hashes: Buffer[], queryArgs?: QueryArgs) => Promise<import("./schema").liteServer_libraryResult>;
}
export {};
