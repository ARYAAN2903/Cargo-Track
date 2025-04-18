const hre = require("hardhat");
const fs = require('fs-extra');
const path = require('path');
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  try {
    // 1. Deploy ManufacturerSupply
    const ManufacturerSupply = await hre.ethers.getContractFactory("ManufacturerSupply");
    const manufacturerSupply = await ManufacturerSupply.deploy();
    await manufacturerSupply.deployed();
    console.log("ManufacturerSupply deployed to:", manufacturerSupply.address);

    // 2. Deploy CargoTracking with ManufacturerSupply address
    const CargoTracking = await hre.ethers.getContractFactory("CargoTracking");
    const cargoTracking = await CargoTracking.deploy(manufacturerSupply.address);
    await cargoTracking.deployed();
    console.log("CargoTracking deployed to:", cargoTracking.address);

    // 3. Deploy EscrowPayment with both addresses
    const EscrowPayment = await hre.ethers.getContractFactory("EscrowPayment");
    const escrowPayment = await EscrowPayment.deploy(
      cargoTracking.address,
      manufacturerSupply.address
    );
    await escrowPayment.deployed();
    console.log("EscrowPayment deployed to:", escrowPayment.address);

    // Save all contract addresses
    const addresses = {
      ManufacturerSupply: manufacturerSupply.address,
      CargoTracking: cargoTracking.address,
      EscrowPayment: escrowPayment.address
    };

    // Write addresses to file
    const addressFile = path.join(__dirname, '..', 'client', 'src', 'contract-addresses.json');
    
    await fs.ensureDir(path.dirname(addressFile));
    await fs.writeJson(addressFile, addresses, { spaces: 2 });
    console.log('Contract addresses written to:', addressFile);

    // Log deployment summary
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("ManufacturerSupply:", manufacturerSupply.address);
    console.log("CargoTracking:", cargoTracking.address);
    console.log("EscrowPayment:", escrowPayment.address);
    console.log("\nAll contracts deployed successfully!");

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });