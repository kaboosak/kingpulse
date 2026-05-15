import assert from "node:assert/strict";

import { getAddress } from "ethers";

import {
  buildMigrationDistribution,
  extractMonadScanPageCount,
  extractMonadScanTxHashes,
} from "../scripts/lib/migration-snapshot.js";

describe("migration snapshot helper", function () {
  const contract = "0x00000000000000000000000000000000000000c0";
  const holderA = "0x00000000000000000000000000000000000000a1";
  const holderB = "0x00000000000000000000000000000000000000b2";
  const treasury = "0x00000000000000000000000000000000000000d3";

  it("excludes contract-held balance by default", async function () {
    const result = buildMigrationDistribution({
      holders: [
        { address: holderA, balance: 20n * 10n ** 18n },
        { address: holderB, balance: 7n * 10n ** 18n },
        { address: contract, balance: 2n * 10n ** 18n },
      ],
      contractAddress: contract,
      decimals: 18,
    });

    assert.equal(result.contractSelfBalance, 2n * 10n ** 18n);
    assert.equal(result.excludedSupply, 2n * 10n ** 18n);
    assert.equal(result.includedSupply, 27n * 10n ** 18n);
    assert.deepEqual(result.distribution, [
      { recipient: getAddress(holderA), amount: "20.0" },
      { recipient: getAddress(holderB), amount: "7.0" },
    ]);
  });

  it("redirects contract-held balance to a replacement recipient when configured", async function () {
    const result = buildMigrationDistribution({
      holders: [
        { address: holderA, balance: 20n * 10n ** 18n },
        { address: contract, balance: 2n * 10n ** 18n },
        { address: treasury, balance: 5n * 10n ** 18n },
      ],
      contractAddress: contract,
      contractSelfBalanceRecipient: treasury,
      decimals: 18,
    });

    assert.equal(result.contractSelfBalance, 2n * 10n ** 18n);
    assert.equal(result.excludedSupply, 0n);
    assert.equal(result.includedSupply, 27n * 10n ** 18n);
    assert.deepEqual(result.distribution, [
      { recipient: getAddress(holderA), amount: "20.0" },
      { recipient: getAddress(treasury), amount: "7.0" },
    ]);
  });

  it("parses monadscan pagination and transaction hashes", async function () {
    const hashA =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const hashB =
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const html = `
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item disabled"><span class="page-link text-nowrap">Page 1 of 23</span></li>
      </ul>
      <a href="/tx/${hashA}" class="myFnExpandBox_searchVal">${hashA}</a>
      <a href="/tx/${hashB}" class="myFnExpandBox_searchVal">${hashB}</a>
      <a href="/tx/${hashA}" class="myFnExpandBox_searchVal">${hashA}</a>
    `;

    assert.equal(extractMonadScanPageCount(html), 23);
    assert.deepEqual(extractMonadScanTxHashes(html), [hashA, hashB]);
  });
});
