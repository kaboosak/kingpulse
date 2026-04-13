import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const normalizedPrivateKey = (
  process.env.OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY || ""
).replace(/^0x/, "");
const monadAccounts = /^[0-9a-fA-F]{64}$/.test(normalizedPrivateKey)
  ? [`0x${normalizedPrivateKey}`]
  : [];

export default defineConfig({
  plugins: [hardhatEthers, hardhatMocha, hardhatVerify],
  defaultNetwork: "hardhat",
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
        settings: {
          metadata: {
            bytecodeHash: "ipfs",
          },
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
      legacy: {
        version: "0.8.28",
        settings: {
          metadata: {
            bytecodeHash: "ipfs",
          },
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    },
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    monad: {
      type: "http",
      chainType: "l1",
      url: process.env.MONAD_RPC_URL || process.env.MONAD_MAINNET_RPC_URL || "",
      accounts: monadAccounts,
      chainId: 143,
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || "",
      customChains: [
        {
          network: "monad",
          chainId: 143,
          urls: {
            apiURL: "https://api.etherscan.io/v2/api",
            browserURL: "https://monadvision.com",
          },
        },
      ],
    },
    sourcify: {
      enabled: true,
      apiUrl: "https://sourcify-api-monad.blockvision.org",
      browserUrl: "https://monadvision.com",
    },
  },
});
