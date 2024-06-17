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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiteClientProvider = void 0;
/* eslint-disable camelcase */
const core_1 = require("@ton/core");
const buffer_1 = require("buffer");
function createLiteClientProvider(client, block, address, init) {
    return {
        async getState() {
            // Resolve block
            let sq; // = block
            if (block === null) {
                const res = await client.getMasterchainInfo();
                sq = res.last;
            }
            else {
                const res = await client.getFullBlock(block);
                const shard = res.shards.find((s) => s.workchain === -1);
                sq = {
                    ...shard,
                };
            }
            // Load state
            // const state = await client.getAccount(sq, address)
            const state = await client.getAccountState(address, sq);
            // Convert state
            const last = state.lastTx // .account.last
                ? {
                    lt: BigInt(state.lastTx.lt),
                    hash: buffer_1.Buffer.from(state.lastTx.hash.toString(16), 'hex'),
                }
                : null;
            let storage;
            if (state.state?.storage.state.type === 'active') {
                storage = {
                    type: 'active',
                    code: state.state?.storage.state.state.code?.toBoc(),
                    data: state.state?.storage.state.state.data?.toBoc(),
                };
            }
            else if (state.state?.storage.state.type === 'uninit') {
                storage = {
                    type: 'uninit',
                };
                //
            }
            else if (state.state?.storage.state.type === 'frozen') {
                storage = {
                    type: 'frozen',
                    stateHash: buffer_1.Buffer.from(state.state.storage.state.stateHash.toString(16), 'hex'),
                };
            }
            else {
                throw Error('Unsupported state');
            }
            return {
                balance: BigInt(state.state.storage.balance.coins),
                last,
                state: storage,
            };
        },
        async get(name, args) {
            let sq; // = block
            if (block === null) {
                const res = await client.getMasterchainInfo();
                sq = res.last;
            }
            else {
                const res = await client.getFullBlock(block);
                const shard = res.shards.find((s) => s.workchain === -1);
                sq = {
                    ...shard,
                };
            }
            // const method = await client.runMethod(address, name, args, sq)c
            const method = await runMethod(client, sq, address, name, args);
            if (method.exitCode !== 0 && method.exitCode !== 1) {
                throw Error('Exit code: ' + method.exitCode);
            }
            return {
                stack: new core_1.TupleReader(method.result),
            };
        },
        async external(message) {
            const res = await client.getMasterchainInfo();
            const sq = res.last;
            // Resolve init
            let neededInit = null;
            if (init &&
                (await client.getAccountState(address, sq)).state?.storage.state.type !== 'active') {
                neededInit = init;
            }
            const ext = (0, core_1.external)({
                to: address,
                init: neededInit ?? null,
                body: message,
            });
            const pkg = (0, core_1.beginCell)().store((0, core_1.storeMessage)(ext)).endCell().toBoc();
            await client.sendMessage(pkg);
        },
        async internal(via, message) {
            const res = await client.getMasterchainInfo();
            const sq = res.last;
            // Resolve init
            let neededInit = null;
            if (init &&
                (await client.getAccountState(address, sq)).state?.storage.state.type !== 'active') {
                neededInit = init;
            }
            // Resolve bounce
            let bounce = true;
            if (message.bounce !== null && message.bounce !== undefined) {
                bounce = message.bounce;
            }
            // Resolve value
            let value;
            if (typeof message.value === 'string') {
                value = (0, core_1.toNano)(message.value);
            }
            else {
                value = message.value;
            }
            // Resolve body
            let body = null;
            if (typeof message.body === 'string') {
                body = (0, core_1.comment)(message.body);
            }
            else if (message.body) {
                body = message.body;
            }
            // Send internal message
            await via.send({
                to: address,
                value,
                bounce,
                sendMode: message.sendMode,
                init: neededInit,
                body,
            });
        },
        open(contract) {
            return (0, core_1.openContract)(contract, (args) => createLiteClientProvider(client, block, args.address, args.init));
        },
        async getTransactions(address, lt, hash, limit) {
            // Resolve last
            const useLimit = typeof limit === 'number';
            if (useLimit && limit <= 0) {
                return [];
            }
            // Load transactions
            let transactions = [];
            do {
                const result = await client.getAccountTransactions(address, lt.toString(), hash, limit ?? 100);
                const txs = core_1.Cell.fromBoc(result.transactions).map((tx) => (0, core_1.loadTransaction)(tx.beginParse()));
                const firstTx = txs[0];
                const [firstLt, firstHash] = [firstTx.lt, firstTx.hash()];
                const needSkipFirst = transactions.length > 0 && firstLt === lt && firstHash.equals(hash);
                if (needSkipFirst) {
                    txs.shift();
                }
                if (txs.length === 0) {
                    break;
                }
                const lastTx = txs[txs.length - 1];
                const [lastLt, lastHash] = [lastTx.lt, lastTx.hash()];
                if (lastLt === lt && lastHash.equals(hash)) {
                    break;
                }
                transactions.push(...txs);
                lt = lastLt;
                hash = lastHash;
            } while (useLimit && transactions.length < limit);
            // Apply limit
            if (useLimit) {
                transactions = transactions.slice(0, limit);
            }
            // Return transactions
            return transactions;
        }
    };
}
exports.createLiteClientProvider = createLiteClientProvider;
/**
 * Execute run method
 * @param seqno block sequence number
 * @param address account address
 * @param name method name
 * @param args method arguments
 * @returns method result
 */
async function runMethod(clinet, seqno, address, name, args) {
    const tail = args ? (0, core_1.serializeTuple)(args).toBoc({ idx: false, crc32: false }) : buffer_1.Buffer.alloc(0);
    const res = await clinet.runMethod(address, name, tail, seqno);
    return {
        exitCode: res.exitCode,
        result: res.result ? (0, core_1.parseTuple)(core_1.Cell.fromBoc(buffer_1.Buffer.from(res.result, 'base64'))[0]) : [],
        resultRaw: res.result,
        block: res.block,
        shardBlock: res.shardBlock,
    };
}
