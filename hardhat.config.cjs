require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      gasPrice: "auto",
      allowUnlimitedContractSize: true,
      gas: 750000,
      gasMultiplier: 1.2
    },
    localhost: {
      chainId: 31337,
      gasPrice: "auto",
      allowUnlimitedContractSize: true,
      gas: 750000,
      gasMultiplier: 1.2
    }
  }
};