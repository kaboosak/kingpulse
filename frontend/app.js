let runtimeConfig = {
  network: {
    chainId: 143,
    chainIdHex: "0x8f",
    chainName: "Monad Mainnet",
    nativeCurrency: {
      name: "Monad",
      symbol: "MON",
      decimals: 18,
    },
    rpcUrls: [],
    explorerBaseUrl: "https://monadvision.com",
  },
  contractAddress: "0xd03f87cba1066afC456ca30cB76E368c18177691",
};

const state = {
  provider: null,
  signer: null,
  account: null,
  owner: null,
  contract: null,
  contractAddress: localStorage.getItem("kingpulse.contractAddress") || runtimeConfig.contractAddress,
  abi: null,
  recentActions: [],
};

const elements = {
  connectWallet: document.getElementById("connect-wallet"),
  switchNetwork: document.getElementById("switch-network"),
  refreshState: document.getElementById("refresh-state"),
  loadContract: document.getElementById("load-contract"),
  connectedAccount: document.getElementById("connected-account"),
  networkName: document.getElementById("network-name"),
  contractAddress: document.getElementById("contract-address"),
  walletRole: document.getElementById("wallet-role"),
  nativeBalance: document.getElementById("native-balance"),
  tokenBalance: document.getElementById("token-balance"),
  contractInput: document.getElementById("contract-input"),
  tokenName: document.getElementById("token-name"),
  tokenSymbol: document.getElementById("token-symbol"),
  tokenDecimals: document.getElementById("token-decimals"),
  tokenSupply: document.getElementById("token-supply"),
  tokenOwner: document.getElementById("token-owner"),
  tokenPaused: document.getElementById("token-paused"),
  balanceForm: document.getElementById("balance-form"),
  balanceAddress: document.getElementById("balance-address"),
  balanceResult: document.getElementById("balance-result"),
  allowanceForm: document.getElementById("allowance-form"),
  allowanceOwner: document.getElementById("allowance-owner"),
  allowanceSpender: document.getElementById("allowance-spender"),
  allowanceResult: document.getElementById("allowance-result"),
  mintForm: document.getElementById("mint-form"),
  transferForm: document.getElementById("transfer-form"),
  approveForm: document.getElementById("approve-form"),
  permitForm: document.getElementById("permit-form"),
  burnForm: document.getElementById("burn-form"),
  burnFromForm: document.getElementById("burn-from-form"),
  mintResult: document.getElementById("mint-result"),
  transferResult: document.getElementById("transfer-result"),
  approveResult: document.getElementById("approve-result"),
  permitResult: document.getElementById("permit-result"),
  burnResult: document.getElementById("burn-result"),
  burnFromResult: document.getElementById("burn-from-result"),
  mintHint: document.getElementById("mint-hint"),
  approveHint: document.getElementById("approve-hint"),
  permitHint: document.getElementById("permit-hint"),
  burnFromHint: document.getElementById("burn-from-hint"),
  pauseHint: document.getElementById("pause-hint"),
  pauseButton: document.getElementById("pause-button"),
  unpauseButton: document.getElementById("unpause-button"),
  recentActions: document.getElementById("recent-actions"),
  activityLog: document.getElementById("activity-log"),
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkify(text) {
  const escaped = escapeHtml(text);
  return escaped.replaceAll(
    /(https:\/\/[^\s)]+)/g,
    '<a class="tx-link" href="$1" target="_blank" rel="noreferrer">$1</a>'
  );
}

function renderRecentActions() {
  if (state.recentActions.length === 0) {
    elements.recentActions.innerHTML = '<p class="empty-state">No transactions yet.</p>';
    return;
  }

  elements.recentActions.innerHTML = state.recentActions
    .map(
      (item) => `
        <article class="action-item">
          <div class="action-item-header">
            <span class="action-item-title">${escapeHtml(item.label)}</span>
            <span class="action-item-time">${escapeHtml(item.time)}</span>
          </div>
          <div class="action-item-body">
            <span>Status: ${escapeHtml(item.status)}</span>
            <span>Hash: <a class="tx-link" href="${item.url}" target="_blank" rel="noreferrer">${item.hash}</a></span>
            ${item.details ? `<span>${escapeHtml(item.details)}</span>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function pushRecentAction(item) {
  state.recentActions.unshift(item);
  state.recentActions = state.recentActions.slice(0, 6);
  renderRecentActions();
}

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("p");
  entry.className = "log-entry";
  entry.innerHTML = `[${escapeHtml(timestamp)}] ${linkify(message)}`;
  elements.activityLog.prepend(entry);
}

function getEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask or another EVM wallet is required in this browser.");
  }

  return window.ethereum;
}

function getEthers() {
  if (!window.ethers) {
    throw new Error("Ethers library failed to load.");
  }

  return window.ethers;
}

function assertAddress(value, label) {
  const ethers = getEthers();

  if (!ethers.isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return ethers.getAddress(value);
}

function parseAmount(value) {
  return getEthers().parseUnits(value, 18);
}

function parseDeadlineMinutes(value) {
  const trimmed = value.trim();
  const minutes = trimmed ? Number(trimmed) : 60;

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Deadline must be a positive number of minutes.");
  }

  return BigInt(Math.floor(Date.now() / 1000) + Math.floor(minutes * 60));
}

function formatAmount(value) {
  return `${getEthers().formatUnits(value, 18)} KPL`;
}

function txUrl(hash) {
  return `${runtimeConfig.network.explorerBaseUrl}/tx/${hash}`;
}

function normalizeError(error) {
  const raw =
    error?.shortMessage ||
    error?.reason ||
    error?.info?.error?.message ||
    error?.message ||
    "Transaction failed.";

  if (raw.includes("BAD_DATA") || raw.includes("could not decode result data")) {
    return "The selected address is not a KingPulse contract on Monad testnet.";
  }

  if (raw.includes("OwnableUnauthorizedAccount")) {
    return "This action is owner-only. Connect the owner wallet to continue.";
  }

  if (raw.includes("ERC20InsufficientAllowance")) {
    return "Allowance is too low for this action.";
  }

  if (raw.includes("ERC20InsufficientBalance")) {
    return "Token balance is too low for this action.";
  }

  if (raw.includes("EnforcedPause")) {
    return "Transfers are currently paused.";
  }

  if (raw.includes("missing revert data")) {
    return "Transaction reverted during simulation. Check wallet role, allowance, paused state, and token balances.";
  }

  return raw;
}

async function fetchAbi() {
  if (state.abi) {
    return state.abi;
  }

  const response = await fetch("/artifacts/contracts/KingPulse.sol/KingPulse.json");

  if (!response.ok) {
    throw new Error("Could not load compiled KingPulse artifact.");
  }

  const artifact = await response.json();
  state.abi = artifact.abi;
  return state.abi;
}

async function loadRuntimeConfig() {
  const response = await fetch("/frontend/runtime-config.json");

  if (!response.ok) {
    throw new Error("Could not load frontend runtime configuration.");
  }

  runtimeConfig = await response.json();

  if (!localStorage.getItem("kingpulse.contractAddress")) {
    state.contractAddress = runtimeConfig.contractAddress;
  }
}

async function ensureProvider() {
  if (!state.provider) {
    const ethers = getEthers();
    state.provider = new ethers.BrowserProvider(getEthereum());
  }

  return state.provider;
}

async function ensureSigner() {
  const provider = await ensureProvider();

  if (!state.signer) {
    state.signer = await provider.getSigner();
  }

  return state.signer;
}

async function ensureContract() {
  const signer = await ensureSigner();
  const abi = await fetchAbi();
  const ethers = getEthers();
  state.contract = new ethers.Contract(state.contractAddress, abi, signer);
  return state.contract;
}

async function getConnectedAccount() {
  const signer = await ensureSigner();
  return signer.getAddress();
}

async function assertOwnerWallet(contract) {
  const [account, owner] = await Promise.all([getConnectedAccount(), contract.owner()]);

  if (account.toLowerCase() !== owner.toLowerCase()) {
    throw new Error("This action requires the owner wallet to be connected.");
  }
}

function setCardDisabled(form, disabled) {
  form.classList.toggle("is-disabled", disabled);
  const submitButton = form.querySelector("button[type='submit']");

  if (submitButton) {
    submitButton.disabled = disabled;
  }
}

async function updateActionAvailability() {
  try {
    if (!window.ethereum) {
      return;
    }

    const contract = await ensureContract();
    const account = await getConnectedAccount();
    const owner = await contract.owner();
    const isOwner = account.toLowerCase() === owner.toLowerCase();
    state.owner = owner;

    elements.walletRole.textContent = isOwner ? "Owner" : "User";

    setCardDisabled(elements.mintForm, !isOwner);
    elements.pauseButton.disabled = !isOwner;
    elements.unpauseButton.disabled = !isOwner;
    elements.pauseButton.closest(".action-card").classList.toggle("is-disabled", !isOwner);

    elements.mintHint.textContent = isOwner
      ? "Owner wallet connected."
      : "Owner wallet required.";
    elements.pauseHint.textContent = isOwner
      ? "Owner wallet connected."
      : "Owner wallet required.";
    elements.approveHint.textContent = "Approves a spender from the connected wallet.";
    elements.permitHint.textContent = "Signs EIP-2612 approval with the connected wallet and submits it on-chain.";

    const burnFromOwnerInput = elements.burnFromForm.querySelector("#burn-from-owner").value.trim();
    const burnFromAmountInput = elements.burnFromForm.querySelector("#burn-from-amount").value.trim();

    if (!burnFromOwnerInput || !burnFromAmountInput) {
      setCardDisabled(elements.burnFromForm, false);
      elements.burnFromHint.textContent = "Requires allowance for the connected wallet.";
      return;
    }

    if (!getEthers().isAddress(burnFromOwnerInput)) {
      setCardDisabled(elements.burnFromForm, true);
      elements.burnFromHint.textContent = "Enter a valid owner address.";
      return;
    }

    let amount;
    try {
      amount = parseAmount(burnFromAmountInput);
    } catch {
      setCardDisabled(elements.burnFromForm, true);
      elements.burnFromHint.textContent = "Enter a valid token amount.";
      return;
    }

    const ownerAddress = assertAddress(burnFromOwnerInput, "owner");
    const allowance = await contract.allowance(ownerAddress, account);
    const hasAllowance = allowance >= amount;

    setCardDisabled(elements.burnFromForm, !hasAllowance);
    elements.burnFromHint.textContent = hasAllowance
      ? `Allowance available: ${formatAmount(allowance)}`
      : `Allowance available: ${formatAmount(allowance)}. Increase allowance first.`;
  } catch (error) {
    elements.mintHint.textContent = "Connect a wallet and load the KingPulse contract.";
    elements.pauseHint.textContent = "Connect a wallet and load the KingPulse contract.";
    elements.permitHint.textContent = "Connect a wallet and load the KingPulse contract.";
    elements.burnFromHint.textContent = "Requires allowance for the connected wallet.";
    setCardDisabled(elements.mintForm, true);
    setCardDisabled(elements.burnFromForm, true);
    elements.pauseButton.disabled = true;
    elements.unpauseButton.disabled = true;
    elements.pauseButton.closest(".action-card").classList.add("is-disabled");
  }
}

async function refreshSession() {
  try {
    elements.contractAddress.textContent = state.contractAddress;

    if (!window.ethereum) {
      elements.networkName.textContent = "Wallet not detected";
      return;
    }

    const provider = await ensureProvider();
    const network = await provider.getNetwork();
    const signer = await ensureSigner();
    const account = await signer.getAddress();
    const contract = await ensureContract();
    const [nativeBalance, tokenBalance, owner] = await Promise.all([
      provider.getBalance(account),
      contract.balanceOf(account),
      contract.owner(),
    ]);

    state.account = account;
    state.owner = owner;

    elements.connectedAccount.textContent = account;
    elements.networkName.textContent = `${network.name} (${network.chainId})`;
    elements.nativeBalance.textContent = `${getEthers().formatEther(nativeBalance)} MON`;
    elements.tokenBalance.textContent = formatAmount(tokenBalance);
    elements.walletRole.textContent =
      account.toLowerCase() === owner.toLowerCase() ? "Owner" : "User";

    await refreshTokenInfo();
    await updateActionAvailability();
  } catch (error) {
    log(normalizeError(error));
  }
}

async function refreshTokenInfo() {
  const contract = await ensureContract();
  const [name, symbol, decimals, totalSupply, owner, paused] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
    contract.owner(),
    contract.paused(),
  ]);

  elements.tokenName.textContent = name;
  elements.tokenSymbol.textContent = symbol;
  elements.tokenDecimals.textContent = decimals.toString();
  elements.tokenSupply.textContent = formatAmount(totalSupply);
  elements.tokenOwner.textContent = owner;
  elements.tokenPaused.textContent = paused ? "true" : "false";
}

async function updateBalanceLookup(address) {
  const contract = await ensureContract();
  const provider = await ensureProvider();
  const [tokenBalance, nativeBalance] = await Promise.all([
    contract.balanceOf(address),
    provider.getBalance(address),
  ]);

  elements.balanceResult.textContent =
    `KPL: ${formatAmount(tokenBalance)} | MON: ${getEthers().formatEther(nativeBalance)}`;
}

async function updateAllowanceLookup(owner, spender) {
  const contract = await ensureContract();
  const allowance = await contract.allowance(owner, spender);
  elements.allowanceResult.textContent = formatAmount(allowance);
}

async function connectWallet() {
  const ethereum = getEthereum();
  await ethereum.request({ method: "eth_requestAccounts" });
  state.provider = null;
  state.signer = null;
  state.contract = null;
  log("Wallet connected.");
  await refreshSession();
}

async function switchToMonad() {
  const ethereum = getEthereum();

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: runtimeConfig.network.chainIdHex }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    if (!runtimeConfig.network.rpcUrls.length) {
      throw new Error("Mainnet RPC URL is not configured for the frontend server.");
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: runtimeConfig.network.chainIdHex,
          chainName: runtimeConfig.network.chainName,
          nativeCurrency: runtimeConfig.network.nativeCurrency,
          rpcUrls: runtimeConfig.network.rpcUrls,
          blockExplorerUrls: [runtimeConfig.network.explorerBaseUrl],
        },
      ],
    });
  }

  state.provider = null;
  state.signer = null;
  state.contract = null;
  log("Monad testnet selected.");
  await refreshSession();
}

async function loadContract() {
  const nextAddress = assertAddress(elements.contractInput.value.trim(), "contract address");
  state.contractAddress = nextAddress;
  localStorage.setItem("kingpulse.contractAddress", nextAddress);
  state.contract = null;
  log(`Loaded contract ${nextAddress}`);
  await refreshSession();
}

async function submitTransaction(label, buildTx) {
  const provider = await ensureProvider();
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== Number(runtimeConfig.network.chainId)) {
    throw new Error(`Switch your wallet to ${runtimeConfig.network.chainName} before sending transactions.`);
  }

  const tx = await buildTx();
  const explorerUrl = txUrl(tx.hash);
  log(`${label} submitted: ${tx.hash} (${explorerUrl})`);
  await tx.wait();
  log(`${label} confirmed: ${explorerUrl}`);
  pushRecentAction({
    label,
    status: "Confirmed",
    hash: tx.hash,
    url: explorerUrl,
    time: new Date().toLocaleTimeString(),
    details: `Contract ${state.contractAddress}`,
  });
  await refreshSession();
  return tx;
}

function bindForm(form, handler) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await handler();
    } catch (error) {
      log(normalizeError(error));
    }
  });
}

async function boot() {
  await loadRuntimeConfig();
  renderRecentActions();
  elements.contractInput.value = state.contractAddress;
  elements.contractAddress.textContent = state.contractAddress;

  elements.connectWallet.addEventListener("click", async () => {
    try {
      await connectWallet();
    } catch (error) {
      log(normalizeError(error));
    }
  });

  elements.switchNetwork.addEventListener("click", async () => {
    try {
      await switchToMonad();
    } catch (error) {
      log(normalizeError(error));
    }
  });

  elements.refreshState.addEventListener("click", async () => {
    await refreshSession();
  });

  ["input", "change"].forEach((eventName) => {
    document.getElementById("burn-from-owner").addEventListener(eventName, updateActionAvailability);
    document.getElementById("burn-from-amount").addEventListener(eventName, updateActionAvailability);
  });

  elements.loadContract.addEventListener("click", async () => {
    try {
      await loadContract();
    } catch (error) {
      log(normalizeError(error));
    }
  });

  bindForm(elements.balanceForm, async () => {
    const address = assertAddress(elements.balanceAddress.value.trim(), "wallet address");
    await updateBalanceLookup(address);
  });

  bindForm(elements.allowanceForm, async () => {
    const owner = assertAddress(elements.allowanceOwner.value.trim(), "owner");
    const spender = assertAddress(elements.allowanceSpender.value.trim(), "spender");
    await updateAllowanceLookup(owner, spender);
  });

  bindForm(elements.mintForm, async () => {
    const contract = await ensureContract();
    await assertOwnerWallet(contract);
    const recipient = assertAddress(document.getElementById("mint-recipient").value.trim(), "recipient");
    const amount = parseAmount(document.getElementById("mint-amount").value.trim());
    await submitTransaction("Mint", () => contract.mint(recipient, amount));
    elements.mintResult.textContent = `Recipient balance: ${formatAmount(await contract.balanceOf(recipient))}`;
    elements.balanceAddress.value = recipient;
    await updateBalanceLookup(recipient);
  });

  bindForm(elements.transferForm, async () => {
    const contract = await ensureContract();
    const recipient = assertAddress(document.getElementById("transfer-recipient").value.trim(), "recipient");
    const amount = parseAmount(document.getElementById("transfer-amount").value.trim());
    await submitTransaction("Transfer", () => contract.transfer(recipient, amount));
    elements.transferResult.textContent = `Recipient balance: ${formatAmount(await contract.balanceOf(recipient))}`;
    elements.balanceAddress.value = recipient;
    await updateBalanceLookup(recipient);
  });

  bindForm(elements.approveForm, async () => {
    const contract = await ensureContract();
    const spender = assertAddress(document.getElementById("approve-spender").value.trim(), "spender");
    const amount = parseAmount(document.getElementById("approve-amount").value.trim());
    const owner = await getConnectedAccount();
    await submitTransaction("Approve", () => contract.approve(spender, amount));
    const allowance = await contract.allowance(owner, spender);
    elements.approveResult.textContent = `Allowance: ${formatAmount(allowance)}`;
    elements.allowanceOwner.value = owner;
    elements.allowanceSpender.value = spender;
    await updateAllowanceLookup(owner, spender);
  });

  bindForm(elements.permitForm, async () => {
    const contract = await ensureContract();
    const owner = await getConnectedAccount();
    const spender = assertAddress(document.getElementById("permit-spender").value.trim(), "spender");
    const amount = parseAmount(document.getElementById("permit-amount").value.trim());
    const deadline = parseDeadlineMinutes(document.getElementById("permit-deadline").value);
    const network = await (await ensureProvider()).getNetwork();
    const nonce = await contract.nonces(owner);

    const domain = {
      name: await contract.name(),
      version: "1",
      chainId: Number(network.chainId),
      verifyingContract: state.contractAddress,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const values = {
      owner,
      spender,
      value: amount,
      nonce,
      deadline,
    };

    const signer = await ensureSigner();
    const signature = await signer.signTypedData(domain, types, values);
    const { v, r, s } = getEthers().Signature.from(signature);

    await submitTransaction("Permit", () =>
      contract.permit(owner, spender, amount, deadline, v, r, s)
    );

    const allowance = await contract.allowance(owner, spender);
    elements.permitResult.textContent =
      `Allowance: ${formatAmount(allowance)} | Deadline: ${deadline.toString()}`;
    elements.allowanceOwner.value = owner;
    elements.allowanceSpender.value = spender;
    await updateAllowanceLookup(owner, spender);
  });

  bindForm(elements.burnForm, async () => {
    const contract = await ensureContract();
    const amount = parseAmount(document.getElementById("burn-amount").value.trim());
    const account = await getConnectedAccount();
    await submitTransaction("Burn", () => contract.burn(amount));
    elements.burnResult.textContent = `Your balance: ${formatAmount(await contract.balanceOf(account))}`;
    elements.balanceAddress.value = account;
    await updateBalanceLookup(account);
  });

  bindForm(elements.burnFromForm, async () => {
    const contract = await ensureContract();
    const owner = assertAddress(document.getElementById("burn-from-owner").value.trim(), "owner");
    const amount = parseAmount(document.getElementById("burn-from-amount").value.trim());
    const caller = await getConnectedAccount();
    const allowance = await contract.allowance(owner, caller);

    if (allowance < amount) {
      throw new Error(
        `Connected wallet allowance is ${formatAmount(allowance)}. Approve more tokens before using burnFrom.`
      );
    }

    await submitTransaction("Burn From", () => contract.burnFrom(owner, amount));
    const remainingAllowance = await contract.allowance(owner, caller);
    elements.burnFromResult.textContent =
      `Owner balance: ${formatAmount(await contract.balanceOf(owner))} | Allowance: ${formatAmount(remainingAllowance)}`;
    elements.balanceAddress.value = owner;
    elements.allowanceOwner.value = owner;
    elements.allowanceSpender.value = caller;
    await updateBalanceLookup(owner);
    await updateAllowanceLookup(owner, caller);
  });

  elements.pauseButton.addEventListener("click", async () => {
    try {
      const contract = await ensureContract();
      await assertOwnerWallet(contract);
      await submitTransaction("Pause", () => contract.pause());
    } catch (error) {
      log(normalizeError(error));
    }
  });

  elements.unpauseButton.addEventListener("click", async () => {
    try {
      const contract = await ensureContract();
      await assertOwnerWallet(contract);
      await submitTransaction("Unpause", () => contract.unpause());
    } catch (error) {
      log(normalizeError(error));
    }
  });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async () => {
      state.provider = null;
      state.signer = null;
      state.contract = null;
      await refreshSession();
    });

    window.ethereum.on("chainChanged", async () => {
      state.provider = null;
      state.signer = null;
      state.contract = null;
      await refreshSession();
    });
  }

  setCardDisabled(elements.mintForm, true);
  setCardDisabled(elements.burnFromForm, true);
  elements.pauseButton.disabled = true;
  elements.unpauseButton.disabled = true;
  elements.pauseButton.closest(".action-card").classList.add("is-disabled");
  await refreshSession();
}

boot().catch((error) => {
  log(normalizeError(error));
});
