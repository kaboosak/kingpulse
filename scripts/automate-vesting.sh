#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  eval "$(
    node --input-type=module <<'EOF'
import dotenv from "dotenv";

const parsed = dotenv.config({ path: ".env" }).parsed || {};

for (const [key, value] of Object.entries(parsed)) {
  const normalized = String(value ?? "").replace(/'/g, `'\\''`);
  console.log(`export ${key}='${normalized}'`);
}
EOF
  )"
fi

MODE="dry-run"
PLAN_FILE="${KINGPULSE_VESTING_PLAN_FILE:-vesting.recommended.json}"
RESULTS_FILE="${KINGPULSE_VESTING_RESULTS_FILE:-vesting.batch.results.log}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute)
      MODE="execute"
      shift
      ;;
    --dry-run)
      MODE="dry-run"
      shift
      ;;
    --plan)
      PLAN_FILE="$2"
      shift 2
      ;;
    *)
      echo "Usage: bash scripts/automate-vesting.sh [--dry-run|--execute] [--plan file]" >&2
      exit 1
      ;;
  esac
done

if [[ -n "${MONAD_MAINNET_RPC_URL:-}" ]] && [[ -z "${MONAD_RPC_URL:-}" || "${MONAD_RPC_URL}" == *"127.0.0.1"* || "${MONAD_RPC_URL}" == *"localhost"* ]]; then
  MONAD_RPC_URL="$MONAD_MAINNET_RPC_URL"
fi
export MONAD_RPC_URL

TOKEN_ADDRESS="${KINGPULSE_ADDRESS:-${KINGPULSE_MAINNET_ADDRESS:-}}"

if [[ -z "${MONAD_RPC_URL:-}" ]]; then
  echo "MONAD_RPC_URL is required." >&2
  exit 1
fi

if [[ -z "$TOKEN_ADDRESS" ]]; then
  echo "KINGPULSE_ADDRESS is required." >&2
  exit 1
fi

function derive_address_from_key() {
  local private_key="$1"
  PRIVATE_KEY_INPUT="$private_key" node --input-type=module <<'EOF'
import { Wallet } from "ethers";

const raw = (process.env.PRIVATE_KEY_INPUT || "").replace(/^0x/, "");
const wallet = new Wallet(`0x${raw}`);
console.log(wallet.address);
EOF
}

function fetch_kpl_balance() {
  local wallet_address="$1"
  local token_address="$2"
  WALLET_ADDRESS="$wallet_address" TOKEN_ADDRESS="$token_address" node --input-type=module <<'EOF'
import { JsonRpcProvider, Contract, formatUnits } from "ethers";

const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL);
const token = new Contract(
  process.env.TOKEN_ADDRESS,
  ["function balanceOf(address) view returns (uint256)"],
  provider
);

const balance = await token.balanceOf(process.env.WALLET_ADDRESS);
console.log(`${balance.toString()}\t${formatUnits(balance, 18)}`);
EOF
}

function fetch_native_balance() {
  local wallet_address="$1"
  WALLET_ADDRESS="$wallet_address" node --input-type=module <<'EOF'
import { JsonRpcProvider, formatEther } from "ethers";

const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL);
const balance = await provider.getBalance(process.env.WALLET_ADDRESS);
console.log(`${balance.toString()}\t${formatEther(balance)}`);
EOF
}

function log_section() {
  echo ""
  echo "== $1 =="
}

echo "Mode: $MODE"
echo "Plan: $PLAN_FILE"
echo "Token: $TOKEN_ADDRESS"
echo "RPC: configured"

if [[ "$MODE" == "execute" ]]; then
  : > "$RESULTS_FILE"
  echo "Results log: $RESULTS_FILE"
fi

while IFS=$'\t' read -r category current_holder beneficiary amount_display amount_wei start duration_days signer_key_env policy; do
  log_section "$category"
  echo "Current holder: $current_holder"
  echo "Beneficiary:    $beneficiary"
  echo "Amount:         $amount_display KPL"
  echo "Start:          $start"
  echo "Duration days:  $duration_days"
  echo "Signer key env: $signer_key_env"
  echo "Policy:         $policy"

  balance_row="$(fetch_kpl_balance "$current_holder" "$TOKEN_ADDRESS")"
  holder_balance_wei="${balance_row%%$'\t'*}"
  holder_balance_display="${balance_row#*$'\t'}"
  native_balance_row="$(fetch_native_balance "$current_holder")"
  holder_native_balance_wei="${native_balance_row%%$'\t'*}"
  holder_native_balance_display="${native_balance_row#*$'\t'}"

  echo "Holder balance: $holder_balance_display KPL"
  echo "Native balance: $holder_native_balance_display MON"

  if [[ "$holder_balance_wei" -lt "$amount_wei" ]]; then
    echo "Status: FAIL - holder balance is lower than the planned vesting amount." >&2
    exit 1
  fi

  if [[ "$holder_native_balance_wei" -eq 0 ]]; then
    echo "Status: FAIL - holder has zero MON for vesting deployment gas." >&2
    exit 1
  fi

  signer_private_key="${!signer_key_env:-}"

  if [[ -z "$signer_private_key" ]]; then
    if [[ "$MODE" == "execute" ]]; then
      echo "Status: FAIL - missing required env var $signer_key_env for live execution." >&2
      exit 1
    fi

    echo "Status: DRY-RUN - missing $signer_key_env, skipping live signer validation."
    continue
  fi

  signer_address="$(derive_address_from_key "$signer_private_key")"
  echo "Signer address: $signer_address"

  if [[ "${signer_address,,}" != "${current_holder,,}" ]]; then
    echo "Status: FAIL - $signer_key_env does not match current holder $current_holder." >&2
    exit 1
  fi

  if [[ "$MODE" == "dry-run" ]]; then
    echo "Status: DRY-RUN - ready to deploy vesting wallet."
    continue
  fi

  echo "Executing vesting deployment..."
  set +e
  deploy_output="$(
    ADMIN_PRIVATE_KEY="$signer_private_key" \
    OWNER_PRIVATE_KEY="$signer_private_key" \
    PRIVATE_KEY="$signer_private_key" \
    KINGPULSE_ADDRESS="$TOKEN_ADDRESS" \
    npm run deploy-vesting -- "$beneficiary" "$start" "$duration_days" "$amount_display" 2>&1
  )"
  deploy_status=$?
  set -e

  echo "$deploy_output"

  if [[ $deploy_status -ne 0 ]]; then
    echo "Status: FAIL - vesting deployment failed for $category." >&2
    exit $deploy_status
  fi

  vesting_wallet_address="$(printf '%s\n' "$deploy_output" | awk '/^Vesting wallet:/ { print $3 }' | tail -n 1)"

  if [[ -z "$vesting_wallet_address" ]]; then
    echo "Status: FAIL - could not detect deployed vesting wallet address." >&2
    exit 1
  fi

  echo "Checking vesting wallet status..."
  set +e
  status_output="$(
    KINGPULSE_ADDRESS="$TOKEN_ADDRESS" \
    npm run vesting-status -- "$vesting_wallet_address" 2>&1
  )"
  status_code=$?
  set -e

  echo "$status_output"

  if [[ $status_code -ne 0 ]]; then
    echo "Status: FAIL - vesting status check failed for $category." >&2
    exit $status_code
  fi

  {
    echo "category=$category"
    echo "current_holder=$current_holder"
    echo "beneficiary=$beneficiary"
    echo "amount=$amount_display"
    echo "vesting_wallet=$vesting_wallet_address"
    echo "---"
  } >> "$RESULTS_FILE"
done < <(node scripts/lib/vesting-plan.js --tsv "$PLAN_FILE")

echo ""
echo "Batch complete."
