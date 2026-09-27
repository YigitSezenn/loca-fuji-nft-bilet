require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

function fujiAccounts() {
  const raw = process.env.PRIVATE_KEY;
  if (!raw) return [];
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  return [key];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 1 },
    },
  },
  networks: {
    hardhat: {
      accounts: {
        count: 60,
      },
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: fujiAccounts(),
    },
  },
};
