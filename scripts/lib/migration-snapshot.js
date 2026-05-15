import path from "node:path";

import { formatUnits, getAddress, isAddress } from "ethers";

function normalizeAddress(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (!isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return getAddress(value);
}

function parsePositiveInteger(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a safe positive integer.`);
  }

  return parsed;
}

function parseBlockReference(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized || normalized === "latest") {
    return "latest";
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be "latest" or a block number.`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a safe non-negative integer block number.`);
  }

  return parsed;
}

function parseSource(value) {
  const normalized = String(value ?? "auto").trim().toLowerCase();
  const supportedSources = new Set(["auto", "logs", "etherscan", "monadscan"]);

  if (!supportedSources.has(normalized)) {
    throw new Error(
      `Snapshot source must be one of: ${[...supportedSources].join(", ")}.`
    );
  }

  return normalized;
}

function extractMonadScanPageCount(html) {
  const match = String(html).match(/Page\s+\d+\s+of\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function extractMonadScanTxHashes(html) {
  const matches = String(html).matchAll(/\/tx\/(0x[a-fA-F0-9]{64})/g);
  const hashes = new Set();

  for (const match of matches) {
    hashes.add(match[1]);
  }

  return [...hashes];
}

function parseSnapshotArgs(argv, env = process.env) {
  const options = {
    contractAddress: env.KINGPULSE_ADDRESS || env.KINGPULSE_MAINNET_ADDRESS || "",
    rpcUrl: env.MONAD_RPC_URL || env.MONAD_MAINNET_RPC_URL || "",
    fromBlock: env.KINGPULSE_SNAPSHOT_FROM_BLOCK || "0",
    toBlock: env.KINGPULSE_SNAPSHOT_TO_BLOCK || "latest",
    chunkSize: env.KINGPULSE_SNAPSHOT_CHUNK_SIZE || "50000",
    source: env.KINGPULSE_SNAPSHOT_SOURCE || "auto",
    explorerBaseUrl:
      env.KINGPULSE_SNAPSHOT_EXPLORER_BASE_URL || "https://monadscan.com",
    etherscanApiUrl:
      env.KINGPULSE_SNAPSHOT_ETHERSCAN_API_URL || "https://api.etherscan.io/v2/api",
    etherscanApiKey:
      env.KINGPULSE_SNAPSHOT_ETHERSCAN_API_KEY || env.ETHERSCAN_API_KEY || "",
    chainId: env.KINGPULSE_SNAPSHOT_CHAIN_ID || "143",
    outputPath: env.KINGPULSE_SNAPSHOT_OUTPUT || "distribution.migration.snapshot.json",
    summaryPath:
      env.KINGPULSE_SNAPSHOT_SUMMARY || "distribution.migration.snapshot.summary.json",
    excludedAddresses: [],
    contractSelfBalanceRecipient: env.KINGPULSE_CONTRACT_SELF_BALANCE_RECIPIENT || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--contract") {
      options.contractAddress = next || "";
      index += 1;
      continue;
    }

    if (arg === "--rpc-url") {
      options.rpcUrl = next || "";
      index += 1;
      continue;
    }

    if (arg === "--from-block") {
      options.fromBlock = next || "";
      index += 1;
      continue;
    }

    if (arg === "--to-block") {
      options.toBlock = next || "";
      index += 1;
      continue;
    }

    if (arg === "--chunk-size") {
      options.chunkSize = next || "";
      index += 1;
      continue;
    }

    if (arg === "--source") {
      options.source = next || "";
      index += 1;
      continue;
    }

    if (arg === "--explorer-base-url") {
      options.explorerBaseUrl = next || "";
      index += 1;
      continue;
    }

    if (arg === "--etherscan-api-url") {
      options.etherscanApiUrl = next || "";
      index += 1;
      continue;
    }

    if (arg === "--etherscan-api-key") {
      options.etherscanApiKey = next || "";
      index += 1;
      continue;
    }

    if (arg === "--chain-id") {
      options.chainId = next || "";
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--summary") {
      options.summaryPath = next || "";
      index += 1;
      continue;
    }

    if (arg === "--exclude") {
      options.excludedAddresses.push(next || "");
      index += 1;
      continue;
    }

    if (arg === "--contract-self-balance-recipient") {
      options.contractSelfBalanceRecipient = next || "";
      index += 1;
      continue;
    }

    if (arg === "--help") {
      return { help: true };
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.rpcUrl) {
    throw new Error("RPC URL is required. Set MONAD_RPC_URL or pass --rpc-url.");
  }

  const contractAddress = normalizeAddress(options.contractAddress, "contract address");
  const excludedAddresses = new Set([contractAddress]);

  for (const value of options.excludedAddresses) {
    excludedAddresses.add(normalizeAddress(value, "excluded address"));
  }

  let contractSelfBalanceRecipient = null;

  if (options.contractSelfBalanceRecipient) {
    contractSelfBalanceRecipient = normalizeAddress(
      options.contractSelfBalanceRecipient,
      "contract self-balance recipient"
    );

    if (contractSelfBalanceRecipient === contractAddress) {
      throw new Error("Contract self-balance recipient cannot be the token contract address.");
    }

    if (excludedAddresses.has(contractSelfBalanceRecipient)) {
      throw new Error("Contract self-balance recipient cannot also be excluded.");
    }
  }

  return {
    help: false,
    rpcUrl: options.rpcUrl,
    contractAddress,
    fromBlock: parseBlockReference(options.fromBlock, "from block"),
    toBlock: parseBlockReference(options.toBlock, "to block"),
    chunkSize: parsePositiveInteger(options.chunkSize, "chunk size"),
    source: parseSource(options.source),
    explorerBaseUrl: String(options.explorerBaseUrl || "https://monadscan.com").replace(
      /\/$/,
      ""
    ),
    etherscanApiUrl: String(
      options.etherscanApiUrl || "https://api.etherscan.io/v2/api"
    ).replace(/\/$/, ""),
    etherscanApiKey: String(options.etherscanApiKey || "").trim(),
    chainId: parsePositiveInteger(options.chainId, "chain id"),
    outputPath: path.resolve(process.cwd(), options.outputPath),
    summaryPath: path.resolve(process.cwd(), options.summaryPath),
    excludedAddresses: [...excludedAddresses],
    contractSelfBalanceRecipient,
  };
}

function buildMigrationDistribution({
  holders,
  contractAddress,
  excludedAddresses = [],
  contractSelfBalanceRecipient = null,
  decimals = 18,
}) {
  const normalizedContract = normalizeAddress(contractAddress, "contract address");
  const excluded = new Set(
    excludedAddresses.map((address) => normalizeAddress(address, "excluded address"))
  );
  const balances = new Map();

  for (const holder of holders) {
    const address = normalizeAddress(holder.address, "holder address");
    const balance = BigInt(holder.balance);

    if (balance < 0n) {
      throw new Error(`Holder balance cannot be negative for ${address}.`);
    }

    balances.set(address, (balances.get(address) ?? 0n) + balance);
  }

  const contractSelfBalance = balances.get(normalizedContract) ?? 0n;
  let excludedSupply = 0n;
  const includedBalances = new Map();

  for (const [address, balance] of balances.entries()) {
    if (balance === 0n) {
      continue;
    }

    if (address === normalizedContract) {
      excludedSupply += balance;
      continue;
    }

    if (excluded.has(address)) {
      excludedSupply += balance;
      continue;
    }

    includedBalances.set(address, balance);
  }

  if (contractSelfBalanceRecipient && contractSelfBalance > 0n) {
    const recipient = normalizeAddress(
      contractSelfBalanceRecipient,
      "contract self-balance recipient"
    );
    includedBalances.set(recipient, (includedBalances.get(recipient) ?? 0n) + contractSelfBalance);
    excludedSupply -= contractSelfBalance;
  }

  const distributionWithRawAmounts = [...includedBalances.entries()]
    .sort((left, right) => {
      if (left[1] === right[1]) {
        return left[0].localeCompare(right[0]);
      }

      return left[1] > right[1] ? -1 : 1;
    })
    .map(([recipient, rawAmount]) => ({
      recipient,
      amount: formatUnits(rawAmount, decimals),
      rawAmount,
    }));

  const includedSupply = distributionWithRawAmounts.reduce(
    (sum, entry) => sum + entry.rawAmount,
    0n
  );

  return {
    contractSelfBalance,
    excludedSupply,
    includedSupply,
    holderCount: distributionWithRawAmounts.length,
    distribution: distributionWithRawAmounts.map(({ rawAmount, ...entry }) => entry),
  };
}

export {
  buildMigrationDistribution,
  extractMonadScanPageCount,
  extractMonadScanTxHashes,
  normalizeAddress,
  parseBlockReference,
  parsePositiveInteger,
  parseSource,
  parseSnapshotArgs,
};
