"use strict";
/**
 * Copyright
 *  (c) 2022 Whales Corp.
 *  (c) 2023 TrueCarry <truecarry@gmail.com>
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _LiteClient_blockLockup, _LiteClient_shardsLockup, _LiteClient_blockHeader, _LiteClient_accounts;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteClient = void 0;
const core_1 = require("@ton/core");
const parseShards_1 = require("./parser/parseShards");
const schema_1 = require("./schema");
const dataloader_1 = __importDefault(require("dataloader"));
const crc16_1 = require("./utils/crc16");
const liteClientProvider_1 = require("./liteClientProvider");
const lru_map_1 = require("lru_map");
const arrays_1 = require("./utils/arrays");
const ZERO = 0n;
//
// Ops
//
const lookupBlockByID = async (engine, props, queryArgs) => {
    return await engine.query(schema_1.Functions.liteServer_lookupBlock, {
        kind: 'liteServer.lookupBlock',
        mode: 1,
        id: {
            kind: 'tonNode.blockId',
            seqno: props.seqno,
            shard: props.shard,
            workchain: props.workchain
        },
        lt: null,
        utime: null
    }, queryArgs);
};
const lookupBlockByUtime = async (engine, props, queryArgs) => {
    return await engine.query(schema_1.Functions.liteServer_lookupBlock, {
        kind: 'liteServer.lookupBlock',
        mode: 4,
        id: {
            kind: 'tonNode.blockId',
            seqno: 0,
            shard: props.shard,
            workchain: props.workchain
        },
        lt: null,
        utime: props.utime
    }, queryArgs);
};
const lookupBlockByLt = async (engine, props, queryArgs) => {
    return await engine.query(schema_1.Functions.liteServer_lookupBlock, {
        kind: 'liteServer.lookupBlock',
        mode: 2,
        id: {
            kind: 'tonNode.blockId',
            seqno: 0,
            shard: props.shard,
            workchain: props.workchain
        },
        lt: props.lt.toString(),
        utime: null,
    }, queryArgs);
};
const getAllShardsInfo = async (engine, props, queryArgs) => {
    let res = (await engine.query(schema_1.Functions.liteServer_getAllShardsInfo, { kind: 'liteServer.getAllShardsInfo', id: props }, queryArgs));
    let parsed = (0, parseShards_1.parseShards)(core_1.Cell.fromBoc(res.data)[0].beginParse());
    let shards = {};
    for (let p of parsed) {
        shards[p[0].toString()] = {};
        for (let p2 of p[1]) {
            shards[p[0].toString()][p2[0]] = p2[1];
        }
    }
    return {
        id: res.id,
        shards,
        raw: res.data,
        proof: res.proof
    };
};
const getBlockHeader = async (engine, props, queryArgs) => {
    return await engine.query(schema_1.Functions.liteServer_getBlockHeader, {
        kind: 'liteServer.getBlockHeader',
        mode: 1,
        id: {
            kind: 'tonNode.blockIdExt',
            seqno: props.seqno,
            shard: props.shard,
            workchain: props.workchain,
            rootHash: props.rootHash,
            fileHash: props.fileHash
        }
    }, queryArgs);
};
function getCacheMap(mapKind, mapOptions) {
    if (typeof mapOptions === 'function') {
        return mapOptions(mapKind);
    }
    if (typeof mapOptions === 'number') {
        return new lru_map_1.LRUMap(mapOptions);
    }
    return new lru_map_1.LRUMap(1000);
}
class LiteClient {
    constructor(opts) {
        _LiteClient_blockLockup.set(this, void 0);
        _LiteClient_shardsLockup.set(this, void 0);
        _LiteClient_blockHeader.set(this, void 0);
        _LiteClient_accounts.set(this, void 0);
        //
        // Sending
        //
        this.sendMessage = async (src) => {
            let res = await this.engine.query(schema_1.Functions.liteServer_sendMessage, { kind: 'liteServer.sendMessage', body: src }, { timeout: 5000 });
            return {
                status: res.status
            };
        };
        //
        // State
        //
        this.getMasterchainInfo = async (queryArgs) => {
            return this.engine.query(schema_1.Functions.liteServer_getMasterchainInfo, { kind: 'liteServer.masterchainInfo' }, queryArgs);
        };
        this.getMasterchainInfoExt = async (queryArgs) => {
            return this.engine.query(schema_1.Functions.liteServer_getMasterchainInfoExt, { kind: 'liteServer.masterchainInfoExt', mode: 0 }, queryArgs);
        };
        this.getCurrentTime = async (queryArgs) => {
            return (await this.engine.query(schema_1.Functions.liteServer_getTime, { kind: 'liteServer.getTime' }, queryArgs)).now;
        };
        this.getVersion = async (queryArgs) => {
            return (await this.engine.query(schema_1.Functions.liteServer_getVersion, { kind: 'liteServer.getVersion' }, queryArgs));
        };
        this.getConfig = async (block, queryArgs) => {
            let res = await this.engine.query(schema_1.Functions.liteServer_getConfigAll, {
                kind: 'liteServer.getConfigAll',
                id: {
                    kind: 'tonNode.blockIdExt',
                    seqno: block.seqno,
                    shard: block.shard,
                    workchain: block.workchain,
                    fileHash: block.fileHash,
                    rootHash: block.rootHash
                },
                mode: 0
            }, queryArgs);
            const configProof = core_1.Cell.fromBoc(res.configProof)[0];
            const configCell = configProof.refs[0];
            const cs = configCell.beginParse();
            let shardState = (0, core_1.loadShardStateUnsplit)(cs);
            if (!shardState.extras) {
                throw Error('Invalid response');
            }
            return shardState.extras;
        };
        //
        // Account
        //
        this.getAccountState = async (src, block) => {
            return __classPrivateFieldGet(this, _LiteClient_accounts, "f").load({
                address: src,
                seqno: block.seqno,
                shard: block.shard,
                workchain: block.workchain,
                fileHash: block.fileHash,
                rootHash: block.rootHash
            });
        };
        this.getAccountStateRaw = async (src, block, queryArgs) => {
            let res = await this.engine.query(schema_1.Functions.liteServer_getAccountState, {
                kind: 'liteServer.getAccountState',
                id: {
                    kind: 'tonNode.blockIdExt',
                    seqno: block.seqno,
                    shard: block.shard,
                    workchain: block.workchain,
                    fileHash: block.fileHash,
                    rootHash: block.rootHash
                },
                account: {
                    kind: 'liteServer.accountId',
                    workchain: src.workChain,
                    id: src.hash
                }
            }, queryArgs);
            let account = null;
            let balance = { coins: ZERO };
            let lastTx = null;
            if (res.state.length > 0) {
                const accountSlice = core_1.Cell.fromBoc(res.state)[0].asSlice();
                if (accountSlice.loadBit()) {
                    account = (0, core_1.loadAccount)(accountSlice);
                    if (account) {
                        balance = account.storage.balance;
                        let shardState = (0, core_1.loadShardStateUnsplit)(core_1.Cell.fromBoc(res.proof)[1].refs[0].beginParse());
                        let hashId = BigInt('0x' + src.hash.toString('hex'));
                        if (shardState.accounts) {
                            let pstate = shardState.accounts.get(hashId);
                            if (pstate) {
                                lastTx = { hash: pstate.shardAccount.lastTransactionHash, lt: pstate.shardAccount.lastTransactionLt };
                            }
                        }
                    }
                }
            }
            return {
                state: account,
                lastTx,
                balance,
                raw: res.state,
                proof: res.proof,
                block: res.id,
                shardBlock: res.shardblk,
                shardProof: res.shardProof
            };
        };
        this.getAccountStatePrunned = async (src, block, queryArgs) => {
            let res = (await this.engine.query(schema_1.Functions.liteServer_getAccountStatePrunned, {
                kind: 'liteServer.getAccountStatePrunned',
                id: {
                    kind: 'tonNode.blockIdExt',
                    seqno: block.seqno,
                    shard: block.shard,
                    workchain: block.workchain,
                    fileHash: block.fileHash,
                    rootHash: block.rootHash
                },
                account: {
                    kind: 'liteServer.accountId',
                    workchain: src.workChain,
                    id: src.hash
                }
            }, queryArgs));
            let stateHash = null;
            if (res.state.length > 0) {
                let stateCell = core_1.Cell.fromBoc(res.state)[0];
                if (!stateCell.isExotic) {
                    throw new Error('Prunned state is not exotic');
                }
                stateHash = core_1.Cell.fromBoc(res.state)[0].bits.subbuffer(8, 256);
            }
            return {
                stateHash,
                raw: res.state,
                proof: res.proof,
                block: res.id,
                shardBlock: res.shardblk,
                shardProof: res.shardProof
            };
        };
        this.getAccountTransaction = async (src, lt, block, queryArgs) => {
            return await this.engine.query(schema_1.Functions.liteServer_getOneTransaction, {
                kind: 'liteServer.getOneTransaction',
                id: block,
                account: {
                    kind: 'liteServer.accountId',
                    workchain: src.workChain,
                    id: src.hash
                },
                lt: lt
            }, queryArgs);
        };
        this.getAccountTransactions = async (src, lt, hash, count, queryArgs) => {
            let loaded = await this.engine.query(schema_1.Functions.liteServer_getTransactions, {
                kind: 'liteServer.getTransactions',
                count,
                account: {
                    kind: 'liteServer.accountId',
                    workchain: src.workChain,
                    id: src.hash
                },
                lt: lt,
                hash: hash
            }, queryArgs);
            return {
                ids: loaded.ids,
                transactions: loaded.transactions
            };
        };
        this.runMethod = async (src, method, params, block, queryArgs) => {
            let res = await this.engine.query(schema_1.Functions.liteServer_runSmcMethod, {
                kind: 'liteServer.runSmcMethod',
                mode: 4,
                id: {
                    kind: 'tonNode.blockIdExt',
                    seqno: block.seqno,
                    shard: block.shard,
                    workchain: block.workchain,
                    rootHash: block.rootHash,
                    fileHash: block.fileHash
                },
                account: {
                    kind: 'liteServer.accountId',
                    workchain: src.workChain,
                    id: src.hash
                },
                methodId: (((0, crc16_1.crc16)(method) & 0xffff) | 0x10000) + '',
                params
            }, queryArgs);
            return {
                exitCode: res.exitCode,
                result: res.result ? res.result.toString('base64') : null,
                block: {
                    seqno: res.id.seqno,
                    shard: res.id.shard,
                    workchain: res.id.workchain,
                    rootHash: res.id.rootHash,
                    fileHash: res.id.fileHash
                },
                shardBlock: {
                    seqno: res.shardblk.seqno,
                    shard: res.shardblk.shard,
                    workchain: res.shardblk.workchain,
                    rootHash: res.shardblk.rootHash,
                    fileHash: res.shardblk.fileHash
                },
            };
        };
        //
        // Block
        //
        this.lookupBlockByID = async (block) => {
            return await __classPrivateFieldGet(this, _LiteClient_blockLockup, "f").load({ ...block, mode: 'id' });
        };
        this.lookupBlockByUtime = async (block) => {
            return await __classPrivateFieldGet(this, _LiteClient_blockLockup, "f").load({ ...block, mode: 'utime' });
        };
        this.lookupBlockByLt = async (block) => {
            return await __classPrivateFieldGet(this, _LiteClient_blockLockup, "f").load({ ...block, mode: 'lt' });
        };
        this.getBlockHeader = async (block) => {
            return __classPrivateFieldGet(this, _LiteClient_blockHeader, "f").load(block);
        };
        this.getAllShardsInfo = async (block) => {
            return __classPrivateFieldGet(this, _LiteClient_shardsLockup, "f").load(block);
        };
        this.listBlockTransactions = async (block, args, queryArgs) => {
            let mode = args?.mode || 1 + 2 + 4;
            let count = args?.count || 100;
            let after = args && args.after ? args.after : null;
            return await this.engine.query(schema_1.Functions.liteServer_listBlockTransactions, {
                kind: 'liteServer.listBlockTransactions',
                id: {
                    kind: 'tonNode.blockIdExt',
                    seqno: block.seqno,
                    shard: block.shard,
                    workchain: block.workchain,
                    rootHash: block.rootHash,
                    fileHash: block.fileHash
                },
                mode,
                count,
                reverseOrder: null,
                after,
                wantProof: null
            }, queryArgs);
        };
        this.getFullBlock = async (seqno) => {
            // MC Blocks
            let [mcBlockId, mcBlockPrevId] = await Promise.all([
                this.lookupBlockByID({ workchain: -1, shard: '-9223372036854775808', seqno: seqno }),
                this.lookupBlockByID({ workchain: -1, shard: '-9223372036854775808', seqno: seqno - 1 })
            ]);
            // Shards
            let [mcShards, mcShardsPrev] = await Promise.all([
                this.getAllShardsInfo(mcBlockId.id),
                this.getAllShardsInfo(mcBlockPrevId.id)
            ]);
            // Extract shards
            let shards = [];
            shards.push({ seqno, workchain: -1, shard: '-9223372036854775808' });
            // Extract shards
            for (let wcs in mcShards.shards) {
                let wc = parseInt(wcs, 10);
                let currShards = mcShards.shards[wcs];
                let prevShards = mcShardsPrev.shards[wcs] || {};
                const currShardIds = Object.keys(currShards);
                const prevShardIds = Object.keys(prevShards);
                const bothBlockShards = (0, arrays_1.findIntersection)(currShardIds, prevShardIds);
                const currBlockShards = (0, arrays_1.findOnlyOnFirst)(currShardIds, prevShardIds);
                // const prevBlockShards = findElementsInArray1NotInArray2(prevShardIds, currShardIds)
                // If shard is present in both blocks - add difference
                for (let shs of bothBlockShards) {
                    let seqno = currShards[shs];
                    let prevSeqno = prevShards[shs] || seqno;
                    for (let s = prevSeqno + 1; s <= seqno; s++) {
                        shards.push({ seqno: s, workchain: wc, shard: shs });
                    }
                }
                // Shards present only in current block, just add them to list
                // todo: check if prev shard block exists?
                for (const shs of currBlockShards) {
                    shards.push({ seqno: currShards[shs], workchain: wc, shard: shs });
                }
                // Shards present only in prev block.
                // todo: check if newer blocks for given shards are present
                // for (const shs of prevBlockShards) {
                //     shards.push({ seqno: currShards[shs], workchain: wc, shard: shs });
                // }
            }
            // Fetch transactions and blocks
            let shards2 = await Promise.all(shards.map(async (shard) => {
                let blockId = await this.lookupBlockByID(shard);
                let transactions = [];
                let after = null;
                while (true) {
                    let tr = await this.listBlockTransactions(blockId.id, {
                        count: 128,
                        mode: 1 + 2 + 4 + (after ? 128 : 0),
                        after
                    });
                    for (let t of tr.ids) {
                        transactions.push(t);
                    }
                    if (!tr.incomplete) {
                        break;
                    }
                    after = { kind: 'liteServer.transactionId3', account: tr.ids[tr.ids.length - 1].account, lt: tr.ids[tr.ids.length - 1].lt };
                }
                let mapped = transactions.map((t) => ({ hash: t.hash, lt: t.lt, account: t.account }));
                return {
                    ...shard,
                    rootHash: blockId.id.rootHash,
                    fileHash: blockId.id.fileHash,
                    transactions: mapped
                };
            }));
            return {
                shards: shards2
            };
        };
        this.getLibraries = async (hashes, queryArgs) => {
            return this.engine.query(schema_1.Functions.liteServer_getLibraries, {
                kind: 'liteServer.getLibraries',
                libraryList: hashes
            }, queryArgs);
        };
        this.engine = opts.engine;
        let batchSize = typeof opts.batchSize === 'number' ? opts.batchSize : 100;
        __classPrivateFieldSet(this, _LiteClient_blockLockup, new dataloader_1.default(async (s) => {
            return await Promise.all(s.map((v) => {
                if (v.mode === 'utime') {
                    return lookupBlockByUtime(this.engine, v);
                }
                if (v.mode === 'lt') {
                    return lookupBlockByLt(this.engine, v);
                }
                return lookupBlockByID(this.engine, v);
            }));
        }, {
            maxBatchSize: batchSize, cacheKeyFn: (s) => {
                if (s.mode === 'id') {
                    return `block::${s.workchain}::${s.shard}::${s.seqno}`;
                }
                else if (s.mode === 'lt') {
                    return `block::${s.workchain}::${s.shard}::lt-${s.lt}`;
                }
                else {
                    return `block::${s.workchain}::${s.shard}::utime-${s.utime}`;
                }
            },
            cacheMap: getCacheMap('block', opts.cacheMap),
        }), "f");
        __classPrivateFieldSet(this, _LiteClient_blockHeader, new dataloader_1.default(async (s) => {
            return await Promise.all(s.map((v) => getBlockHeader(this.engine, v)));
        }, {
            maxBatchSize: batchSize,
            cacheKeyFn: (s) => `header::${s.workchain}::${s.shard}::${s.seqno}`,
            cacheMap: getCacheMap('header', opts.cacheMap),
        }), "f");
        __classPrivateFieldSet(this, _LiteClient_shardsLockup, new dataloader_1.default(async (s) => {
            return await Promise.all(s.map((v) => getAllShardsInfo(this.engine, v)));
        }, {
            maxBatchSize: batchSize,
            cacheKeyFn: (s) => `shard::${s.workchain}::${s.shard}::${s.seqno}`,
            cacheMap: getCacheMap('shard', opts.cacheMap),
        }), "f");
        __classPrivateFieldSet(this, _LiteClient_accounts, new dataloader_1.default(async (s) => {
            return await Promise.all(s.map((v) => this.getAccountStateRaw(v.address, {
                fileHash: v.fileHash,
                rootHash: v.rootHash,
                seqno: v.seqno,
                shard: v.shard,
                workchain: v.workchain,
            })));
        }, {
            maxBatchSize: batchSize,
            cacheKeyFn: (s) => `account::${s.workchain}::${s.shard}::${s.seqno}::${s.address.toRawString()}`,
            cacheMap: getCacheMap('account', opts.cacheMap),
        }), "f");
    }
    /**
     * Open a contract
     * @param contract
     */
    open(contract) {
        return (0, core_1.openContract)(contract, (args) => (0, liteClientProvider_1.createLiteClientProvider)(this, null, args.address, args.init));
    }
    /**
     * Create a new contract provider
     * @param address
     * @param init
     */
    provider(address, init) {
        return (0, liteClientProvider_1.createLiteClientProvider)(this, null, address, init ?? null);
    }
}
exports.LiteClient = LiteClient;
_LiteClient_blockLockup = new WeakMap(), _LiteClient_shardsLockup = new WeakMap(), _LiteClient_blockHeader = new WeakMap(), _LiteClient_accounts = new WeakMap();
