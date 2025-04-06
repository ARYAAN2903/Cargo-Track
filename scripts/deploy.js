const hre = require("hardhat");
const fs = require('fs-extra');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy ManufacturerSupply
  const ManufacturerSupply = await hre.ethers.getContractFactory("ManufacturerSupply");
  const manufacturerSupply = await ManufacturerSupply.deploy();
  await manufacturerSupply.deployed();
  console.log("ManufacturerSupply deployed to:", manufacturerSupply.address);

  // Deploy CargoTracking with ManufacturerSupply address
  const CargoTracking = await hre.ethers.getContractFactory("CargoTracking");
  const cargoTracking = await CargoTracking.deploy(manufacturerSupply.address);
  await cargoTracking.deployed();
  console.log("CargoTracking deployed to:", cargoTracking.address);

  // Save contract addresses
  const addresses = {
    ManufacturerSupply: manufacturerSupply.address,
    CargoTracking: cargoTracking.address
  };

  const addressFile = path.join(__dirname, '..', 'client', 'src', 'contract-addresses.json');
  
  try {
    await fs.ensureDir(path.dirname(addressFile));
    await fs.writeJson(addressFile, addresses, { spaces: 2 });
    console.log('Contract addresses written to:', addressFile);
  } catch (err) {
    console.error('Error writing contract addresses:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });