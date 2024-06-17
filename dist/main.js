"use strict";
/**
 * Copyright (c) Whales Corp.
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const single_1 = require("./engines/single");
const roundRobin_1 = require("./engines/roundRobin");
const client_1 = require("./client");
const core_1 = require("@ton/core");
// import { formatDistance } from "date-fns";
const teslabot_1 = require("teslabot");
const backoff = (0, teslabot_1.createBackoff)();
function intToIP(int) {
    var part1 = int & 255;
    var part2 = ((int >> 8) & 255);
    var part3 = ((int >> 16) & 255);
    var part4 = ((int >> 24) & 255);
    return part4 + "." + part3 + "." + part2 + "." + part1;
}
let server = {
    "ip": 1097649206,
    "port": 29296,
    "id": {
        "@type": "pub.ed25519",
        "key": "p2tSiaeSqX978BxE5zLxuTQM06WVDErf5/15QToxMYA="
    }
};
async function main() {
    const engines = [];
    for (let i = 0; i < 1; i++) {
        engines.push(new single_1.LiteSingleEngine({
            host: `tcp://${intToIP(server.ip)}:${server.port}`,
            // host: `wss://ws.tonlens.com/?ip=${server.ip}&port=${server.port}&pubkey=${server.id.key}`,
            publicKey: Buffer.from(server.id.key, 'base64'),
            // client: 'ws'
        }));
    }
    const engine = new roundRobin_1.LiteRoundRobinEngine(engines);
    const client = new client_1.LiteClient({ engine });
    console.log('get master info');
    const master = await client.getMasterchainInfo();
    console.log('master', master);
    const address = core_1.Address.parse('kQC2sf_Hy34aMM7n9f9_V-ThHDehjH71LWBETy_JrTirPIHa');
    while (true) {
        let latest = await client.getMasterchainInfo();
        console.log("Latest block: " + latest.last.seqno);
        await client.getFullBlock(latest.last.seqno);
        const libRes = await client.getLibraries([
            Buffer.from('587cc789eff1c84f46ec3797e45fc809a14ff5ae24f1e0c7a6a99cc9dc9061ff', 'hex'),
            Buffer.from('bd3d7ccaf2b4ccf7fc8f1e9abaf8781e5a783f1d1e075dfab884b1d795f23666', 'hex')
        ]);
        console.log('libRes: ', libRes);
        console.log('Account state full   :', core_1.Cell.fromBoc((await client.getAccountState(address, latest.last)).raw)[0].hash().toString('hex'));
        console.log('Account state prunned:', (await client.getAccountStatePrunned(address, latest.last)).stateHash?.toString('hex'));
        // https://test-explorer.toncoin.org/transaction?account=EQBPId-mitsa7ldOJiYKMABPo64DxO46e93AiWXImbcPGzjI&lt=17770551000001&hash=ea5be964a475f24365ad9199e67ceb2309f4260a0fae697eed91e7fe1d168b97
        const lt = 17770551000001n;
        const blockSeqno = 16944437;
        const blockByLt = await client.lookupBlockByLt({
            shard: latest.last.shard,
            workchain: 0,
            lt,
        });
        console.log('Block by lt', blockByLt);
        if (blockByLt.id.seqno !== blockSeqno) {
            throw new Error('Wrong lt');
        }
        const start = Date.now();
        const res = await client.getMasterchainInfo({ timeout: 15000, awaitSeqno: latest.last.seqno + 2 });
        console.log('wait res', Date.now() - start, res);
        const blockData = await client.getFullBlock(34745880);
        // Should be 288
        console.log('block data', blockData, blockData.shards[1].transactions.length);
        await new Promise((resolve, reject) => setTimeout(resolve, 3000));
    }
}
main();
