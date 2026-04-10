require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");

const normalizedPrivateKey = (
  process.env.OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY || ""
).replace(/^0x/, "");
const monadAccounts = /^[0-9a-fA-F]{64}$/.test(normalizedPrivateKey)
  ? [`0x${normalizedPrivateKey}`]
  : [];

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
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
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    monad: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts: monadAccounts,
      chainId: 10143,
    },
    monadMainnet: {
      url: process.env.MONAD_MAINNET_RPC_URL || "",
      accounts: monadAccounts,
      chainId: 143,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "monad",
        chainId: 10143,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://testnet.monadscan.com",
        },
      },
      {
        network: "monadMainnet",
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
};
