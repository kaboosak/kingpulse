import fs from "node:fs";
import path from "node:path";

import { Interface, JsonRpcProvider, formatUnits, getAddress } from "ethers";

import {
  buildMigrationDistribution,
  extractMonadScanPageCount,
  extractMonadScanTxHashes,
  parseSnapshotArgs,
} from "./lib/migration-snapshot.js";

const TOKEN_INTERFACE = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
]);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BALANCE_PROGRESS_INTERVAL = 10;
const BALANCE_CALL_DELAY_MS = 75;
const RECEIPT_BATCH_SIZE = 10;
const RECEIPT_BATCH_DELAY_MS = 500;
const RECEIPT_RETRY_LIMIT = 5;
const ETHERSCAN_PAGE_SIZE = 10000;
const MONADSCAN_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; KingPulseSnapshot/1.0; +https://monadscan.com)",
};

function printHelp() {
  console.log(`Usage: npm run snapshot:holders -- [options]

Options:
  --contract <address>                       Token contract to snapshot.
  --rpc-url <url>                            RPC URL to query.
  --from-block <number>                      First block to scan for Transfer logs.
  --to-block <number|latest>                 Final block to snapshot. Defaults to latest.
  --chunk-size <number>                      Log-scan chunk size. Defaults to 50000.
  --source <auto|logs|etherscan|monadscan>   Snapshot discovery source. Defaults to auto.
  --explorer-base-url <url>                  Explorer base for MonadScan fallback.
  --etherscan-api-url <url>                  Etherscan V2 API base for token transfer fallback.
  --etherscan-api-key <key>                  Etherscan API key. Defaults to ETHERSCAN_API_KEY.
  --chain-id <number>                        Etherscan-compatible chain id. Defaults to 143.
  --output <path>                            Output distribution JSON file.
  --summary <path>                           Output summary JSON file.
  --exclude <address>                        Exclude an address from the migration plan. Repeatable.
  --contract-self-balance-recipient <addr>   Redirect stranded contract-held KPL to a replacement recipient.
  --help                                     Show this message.

Environment:
  MONAD_RPC_URL
  KINGPULSE_ADDRESS
  KINGPULSE_SNAPSHOT_FROM_BLOCK
  KINGPULSE_SNAPSHOT_TO_BLOCK
  KINGPULSE_SNAPSHOT_CHUNK_SIZE
  KINGPULSE_SNAPSHOT_SOURCE
  KINGPULSE_SNAPSHOT_EXPLORER_BASE_URL
  KINGPULSE_SNAPSHOT_ETHERSCAN_API_URL
  KINGPULSE_SNAPSHOT_ETHERSCAN_API_KEY
  KINGPULSE_SNAPSHOT_CHAIN_ID
  ETHERSCAN_API_KEY
  KINGPULSE_SNAPSHOT_OUTPUT
  KINGPULSE_SNAPSHOT_SUMMARY
  KINGPULSE_CONTRACT_SELF_BALANCE_RECIPIENT
`);
}

async function callToken(provider, contractAddress, method, args = [], blockTag = "latest") {
  const data = TOKEN_INTERFACE.encodeFunctionData(method, args);
  const rawResult = await provider.call({ to: contractAddress, data }, blockTag);
  const [result] = TOKEN_INTERFACE.decodeFunctionResult(method, rawResult);
  return result;
}

async function callTokenWithRetry(
  provider,
  contractAddress,
  method,
  args = [],
  blockTag = "latest"
) {
  for (let attempt = 1; attempt <= RECEIPT_RETRY_LIMIT; attempt += 1) {
    try {
      return await callToken(provider, contractAddress, method, args, blockTag);
    } catch (error) {
      if (!isRateLimitError(error) || attempt === RECEIPT_RETRY_LIMIT) {
        throw error;
      }

      await sleep(RECEIPT_BATCH_DELAY_MS * attempt);
    }
  }

  throw new Error(`Failed to call ${method}.`);
}

async function callTokenOptional(provider, contractAddress, method, blockTag) {
  try {
    return await callToken(provider, contractAddress, method, [], blockTag);
  } catch {
    return null;
  }
}

function addParticipant(participants, address) {
  if (!address || address === ZERO_ADDRESS) {
    return;
  }

  participants.add(getAddress(address));
}

async function collectParticipantsFromLogs({
  provider,
  contractAddress,
  fromBlock,
  toBlock,
  chunkSize,
}) {
  const transferEvent = TOKEN_INTERFACE.getEvent("Transfer");
  const participants = new Set([getAddress(contractAddress)]);

  for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize - 1, toBlock);

    let logs;
    try {
      logs = await provider.getLogs({
        address: contractAddress,
        topics: [transferEvent.topicHash],
        fromBlock: chunkStart,
        toBlock: chunkEnd,
      });
    } catch (error) {
      throw new Error(
        [
          `Failed to scan Transfer logs for blocks ${chunkStart}-${chunkEnd}.`,
          "Try a smaller --chunk-size if the RPC refuses large ranges.",
          error.message,
        ].join(" ")
      );
    }

    for (const log of logs) {
      const parsed = TOKEN_INTERFACE.parseLog(log);
      const from = parsed.args.from;
      const to = parsed.args.to;

      addParticipant(participants, from);
      addParticipant(participants, to);
    }

    console.log(
      `Scanned blocks ${chunkStart}-${chunkEnd}: ${logs.length} Transfer logs, ${participants.size} participant candidates so far.`
    );
  }

  return [...participants];
}

function isGetLogsRangeLimitError(error) {
  return /eth_getlogs.+limited to a \d+ range/i.test(error.message);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: MONADSCAN_HEADERS });

  if (!response.ok) {
    throw new Error(`Explorer request failed (${response.status}) for ${url}.`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: MONADSCAN_HEADERS });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}.`);
  }

  return response.json();
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRateLimitError(error) {
  return /request limit reached/i.test(error.message);
}

async function getTransactionReceiptWithRetry(provider, txHash) {
  for (let attempt = 1; attempt <= RECEIPT_RETRY_LIMIT; attempt += 1) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error(`Missing receipt for transaction ${txHash}.`);
      }

      return receipt;
    } catch (error) {
      if (!isRateLimitError(error) || attempt === RECEIPT_RETRY_LIMIT) {
        throw error;
      }

      await sleep(RECEIPT_BATCH_DELAY_MS * attempt);
    }
  }

  throw new Error(`Failed to fetch receipt for transaction ${txHash}.`);
}

async function fetchMonadScanTransactionHashes({ contractAddress, explorerBaseUrl }) {
  const encodedAddress = encodeURIComponent(contractAddress);
  const firstPageUrl = `${explorerBaseUrl}/txs?a=${encodedAddress}`;
  const firstPageHtml = await fetchText(firstPageUrl);
  const pageCount = extractMonadScanPageCount(firstPageHtml);
  const txHashes = new Set(extractMonadScanTxHashes(firstPageHtml));

  console.log(
    `Explorer fallback: loaded page 1/${pageCount}, ${txHashes.size} unique contract transactions so far.`
  );

  for (let page = 2; page <= pageCount; page += 1) {
    const html = await fetchText(`${firstPageUrl}&p=${page}`);

    for (const hash of extractMonadScanTxHashes(html)) {
      txHashes.add(hash);
    }

    console.log(
      `Explorer fallback: loaded page ${page}/${pageCount}, ${txHashes.size} unique contract transactions so far.`
    );
  }

  return [...txHashes];
}

async function fetchEtherscanTokenTransfers({
  contractAddress,
  etherscanApiUrl,
  etherscanApiKey,
  chainId,
}) {
  if (!etherscanApiKey) {
    throw new Error("ETHERSCAN_API_KEY is required for the Etherscan fallback.");
  }

  const transfers = [];

  for (let page = 1; ; page += 1) {
    const url = new URL(etherscanApiUrl);
    url.searchParams.set("chainid", String(chainId));
    url.searchParams.set("module", "account");
    url.searchParams.set("action", "tokentx");
    url.searchParams.set("contractaddress", contractAddress);
    url.searchParams.set("page", String(page));
    url.searchParams.set("offset", String(ETHERSCAN_PAGE_SIZE));
    url.searchParams.set("sort", "asc");
    url.searchParams.set("apikey", etherscanApiKey);

    const payload = await fetchJson(url.toString());

    if (payload.status === "0" && payload.message === "No transactions found") {
      break;
    }

    if (payload.status !== "1" || !Array.isArray(payload.result)) {
      throw new Error(`Etherscan API error: ${payload.result ?? payload.message}`);
    }

    transfers.push(...payload.result);

    console.log(
      `Etherscan fallback: loaded page ${page}, ${transfers.length} token transfer events so far.`
    );

    if (payload.result.length < ETHERSCAN_PAGE_SIZE) {
      break;
    }
  }

  return transfers;
}

async function collectParticipantsFromEtherscan({
  contractAddress,
  fromBlock,
  toBlock,
  etherscanApiUrl,
  etherscanApiKey,
  chainId,
}) {
  const transfers = await fetchEtherscanTokenTransfers({
    contractAddress,
    etherscanApiUrl,
    etherscanApiKey,
    chainId,
  });
  const participants = new Set([getAddress(contractAddress)]);
  let transferCount = 0;

  for (const transfer of transfers) {
    const blockNumber = Number(transfer.blockNumber);

    if (!Number.isSafeInteger(blockNumber)) {
      continue;
    }

    if (blockNumber < fromBlock || blockNumber > toBlock) {
      continue;
    }

    transferCount += 1;

    addParticipant(participants, transfer.from);
    addParticipant(participants, transfer.to);
  }

  console.log(
    `Etherscan fallback: retained ${transferCount} transfer events across ${participants.size} participant candidates.`
  );

  return [...participants];
}

async function collectParticipantsFromMonadScan({
  provider,
  contractAddress,
  explorerBaseUrl,
  fromBlock,
  toBlock,
}) {
  const contractAddressLower = contractAddress.toLowerCase();
  const transferEvent = TOKEN_INTERFACE.getEvent("Transfer");
  const txHashes = await fetchMonadScanTransactionHashes({
    contractAddress,
    explorerBaseUrl,
  });
  const participants = new Set([getAddress(contractAddress)]);
  let transferLogCount = 0;

  for (let index = 0; index < txHashes.length; index += RECEIPT_BATCH_SIZE) {
    const batch = txHashes.slice(index, index + RECEIPT_BATCH_SIZE);
    const receipts = await Promise.all(
      batch.map((txHash) => getTransactionReceiptWithRetry(provider, txHash))
    );

    for (const receipt of receipts) {
      if (receipt.blockNumber < fromBlock || receipt.blockNumber > toBlock) {
        continue;
      }

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contractAddressLower) {
          continue;
        }

        if (log.topics[0] !== transferEvent.topicHash) {
          continue;
        }

        const parsed = TOKEN_INTERFACE.parseLog(log);
        const from = parsed.args.from;
        const to = parsed.args.to;

        transferLogCount += 1;

        addParticipant(participants, from);
        addParticipant(participants, to);
      }
    }

    console.log(
      `Explorer fallback: checked ${Math.min(index + RECEIPT_BATCH_SIZE, txHashes.length)}/${txHashes.length} receipts, ${transferLogCount} Transfer logs, ${participants.size} participant candidates so far.`
    );

    if (index + RECEIPT_BATCH_SIZE < txHashes.length) {
      await sleep(RECEIPT_BATCH_DELAY_MS);
    }
  }

  return [...participants];
}

async function collectParticipants(options) {
  if (options.source === "logs") {
    return {
      participants: await collectParticipantsFromLogs(options),
      resolvedSource: "logs",
    };
  }

  if (options.source === "etherscan") {
    return {
      participants: await collectParticipantsFromEtherscan(options),
      resolvedSource: "etherscan",
    };
  }

  if (options.source === "monadscan") {
    return {
      participants: await collectParticipantsFromMonadScan(options),
      resolvedSource: "monadscan",
    };
  }

  try {
    return {
      participants: await collectParticipantsFromLogs(options),
      resolvedSource: "logs",
    };
  } catch (error) {
    if (!isGetLogsRangeLimitError(error)) {
      throw error;
    }

    if (options.etherscanApiKey) {
      console.log(
        "RPC log scan hit a range limit. Falling back to the Etherscan V2 token transfer API."
      );

      try {
        return {
          participants: await collectParticipantsFromEtherscan(options),
          resolvedSource: "etherscan",
        };
      } catch (etherscanError) {
        console.log(
          `Etherscan fallback failed: ${etherscanError.message}. Falling back to MonadScan transaction history.`
        );
      }
    }

    console.log(
      "RPC log scan hit a range limit. Falling back to MonadScan transaction history."
    );

    return {
      participants: await collectParticipantsFromMonadScan(options),
      resolvedSource: "monadscan",
    };
  }
}

async function fetchHolderBalances({
  provider,
  contractAddress,
  participants,
  blockTag,
  decimals,
}) {
  const holders = [];

  for (let index = 0; index < participants.length; index += 1) {
    const address = participants[index];
    const balance = await callTokenWithRetry(
      provider,
      contractAddress,
      "balanceOf",
      [address],
      blockTag
    );

    if (balance > 0n) {
      holders.push({ address, balance });
    }

    if (
      (index + 1) % BALANCE_PROGRESS_INTERVAL === 0 ||
      index + 1 === participants.length
    ) {
      console.log(
        `Checked balances for ${index + 1}/${participants.length} participants.`
      );
    }

    if (index + 1 < participants.length) {
      await sleep(BALANCE_CALL_DELAY_MS);
    }
  }

  holders.sort((left, right) => {
    if (left.balance === right.balance) {
      return left.address.localeCompare(right.address);
    }

    return left.balance > right.balance ? -1 : 1;
  });

  console.log(
    `Resolved ${holders.length} non-zero holder balances at block ${blockTag}. Decimals: ${decimals}.`
  );

  return holders;
}

async function main() {
  const options = parseSnapshotArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const provider = new JsonRpcProvider(options.rpcUrl);
  const latestBlock = await provider.getBlockNumber();
  const snapshotBlock = options.toBlock === "latest" ? latestBlock : options.toBlock;
  const fromBlock = options.fromBlock === "latest" ? latestBlock : options.fromBlock;

  if (fromBlock > snapshotBlock) {
    throw new Error(
      `From block ${fromBlock} cannot be greater than snapshot block ${snapshotBlock}.`
    );
  }

  console.log(`Snapshot contract: ${options.contractAddress}`);
  console.log(`RPC URL: ${options.rpcUrl}`);
  console.log(`Snapshot source: ${options.source}`);
  console.log(`Scanning Transfer activity from block ${fromBlock} to ${snapshotBlock}`);
  console.log(`Chunk size: ${options.chunkSize}`);
  console.log(`Explorer base URL: ${options.explorerBaseUrl}`);
  console.log(`Etherscan API URL: ${options.etherscanApiUrl}`);
  console.log(`Etherscan chain id: ${options.chainId}`);

  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    callToken(provider, options.contractAddress, "name", [], snapshotBlock),
    callToken(provider, options.contractAddress, "symbol", [], snapshotBlock),
    callToken(provider, options.contractAddress, "decimals", [], snapshotBlock),
    callToken(provider, options.contractAddress, "totalSupply", [], snapshotBlock),
    callTokenOptional(provider, options.contractAddress, "owner", snapshotBlock),
    callTokenOptional(provider, options.contractAddress, "paused", snapshotBlock),
  ]);

  const participantResult = await collectParticipants({
    provider,
    contractAddress: options.contractAddress,
    fromBlock,
    toBlock: snapshotBlock,
    chunkSize: options.chunkSize,
    source: options.source,
    explorerBaseUrl: options.explorerBaseUrl,
    etherscanApiUrl: options.etherscanApiUrl,
    etherscanApiKey: options.etherscanApiKey,
    chainId: options.chainId,
  });
  const participants = participantResult.participants;
  const resolvedSource = participantResult.resolvedSource;

  console.log(`Resolved participant source: ${resolvedSource}`);

  console.log("Cooling down RPC rate limiter before balance resolution.");
  await sleep(RECEIPT_BATCH_DELAY_MS * 2);

  const holders = await fetchHolderBalances({
    provider,
    contractAddress: options.contractAddress,
    participants,
    blockTag: snapshotBlock,
    decimals: Number(decimals),
  });

  const migrationPlan = buildMigrationDistribution({
    holders,
    contractAddress: options.contractAddress,
    excludedAddresses: options.excludedAddresses,
    contractSelfBalanceRecipient: options.contractSelfBalanceRecipient,
    decimals: Number(decimals),
  });

  fs.writeFileSync(options.outputPath, `${JSON.stringify(migrationPlan.distribution, null, 2)}\n`);

  const summary = {
    generatedAt: new Date().toISOString(),
    contract: options.contractAddress,
    token: {
      name,
      symbol,
      decimals: Number(decimals),
    },
    snapshot: {
      fromBlock,
      toBlock: snapshotBlock,
      latestBlockObserved: latestBlock,
      chunkSize: options.chunkSize,
      sourceRequested: options.source,
      sourceResolved: resolvedSource,
      explorerBaseUrl: options.explorerBaseUrl,
      etherscanApiUrl: options.etherscanApiUrl,
      chainId: options.chainId,
    },
    owner: owner ?? null,
    paused: paused === null ? null : Boolean(paused),
    totalSupply: formatUnits(totalSupply, Number(decimals)),
    contractSelfBalance: formatUnits(
      migrationPlan.contractSelfBalance,
      Number(decimals)
    ),
    excludedSupply: formatUnits(migrationPlan.excludedSupply, Number(decimals)),
    includedSupply: formatUnits(migrationPlan.includedSupply, Number(decimals)),
    holderCount: migrationPlan.holderCount,
    participantCandidates: participants.length,
    nonZeroHoldersObserved: holders.length,
    contractSelfBalancePolicy: options.contractSelfBalanceRecipient
      ? `redirected to ${options.contractSelfBalanceRecipient}`
      : "excluded from replacement distribution",
    excludedAddresses: options.excludedAddresses,
    distributionFile: path.relative(process.cwd(), options.outputPath),
  };

  fs.writeFileSync(options.summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log("");
  console.log(`Wrote migration distribution: ${options.outputPath}`);
  console.log(`Wrote migration summary: ${options.summaryPath}`);
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Total supply: ${summary.totalSupply} KPL`);
  console.log(`Contract-held balance: ${summary.contractSelfBalance} KPL`);
  console.log(`Included migration supply: ${summary.includedSupply} KPL`);
  console.log(`Excluded supply: ${summary.excludedSupply} KPL`);
  console.log(`Recipients in distribution: ${summary.holderCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
