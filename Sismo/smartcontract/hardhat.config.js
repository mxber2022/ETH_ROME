require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });
/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: "0.8.18",

  networks: {
    'gnosis-testnet': {
      url: 'https://rpc.chiadochain.net',
      accounts: [process.env.PRIVATE_KEY],
    },
    
    'base-testnet': {
      url: 'https://base-goerli.public.blastapi.io',
      accounts: [process.env.PRIVATE_KEY],
    },

  },

  etherscan: {
    apiKey: {
      "gnosis-testnet": "abc",
      "base-testnet": "abc"
    },

    customChains: [
      {
        network: "gnosis-testnet",
        chainId: 10200,
        urls: {
          apiURL: "https://eth-goerli.blockscout.com/api",
          browserURL: '',
        },
      },

      {
        network: "base-testnet",
        chainId: 84531,
        urls: {
          apiURL: "https://api-goerli.basescan.org/api",
          browserURL: '',
        },
      },
    ],

  },
}