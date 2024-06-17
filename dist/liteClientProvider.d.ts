/**
 * Copyright
 *  (c) 2022 Whales Corp.
 *  (c) 2023 TrueCarry <truecarry@gmail.com>
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Address, ContractProvider, StateInit } from '@ton/core';
import { LiteClient } from './';
export declare function createLiteClientProvider(client: LiteClient, block: number | null, address: Address, init: StateInit | null): ContractProvider;
