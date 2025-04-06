const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Penalty", function () {
    let cargoTracking;
    let manufacturerSupply;
    let milestoneTracking;
    let penalty;
    let owner;
    let manufacturer;
    let supplier;
    let carrier;
    const depositAmount = ethers.utils.parseEther("2.0");

    beforeEach(async function () {
        [owner, manufacturer, supplier, carrier] = await ethers.getSigners();

        // Deploy contracts
        const ManufacturerSupply = await ethers.getContractFactory("contracts/ManufacturerSupply.sol:ManufacturerSupply");
        manufacturerSupply = await ManufacturerSupply.deploy();
        await manufacturerSupply.deployed();

        const CargoTracking = await ethers.getContractFactory("CargoTracking");
        cargoTracking = await CargoTracking.deploy(manufacturerSupply.address);
        await cargoTracking.deployed();

        const MilestoneTracking = await ethers.getContractFactory("MilestoneTracking");
        milestoneTracking = await MilestoneTracking.deploy(cargoTracking.address, manufacturerSupply.address);
        await milestoneTracking.deployed();

        const Penalty = await ethers.getContractFactory("Penalty");
        penalty = await Penalty.deploy(cargoTracking.address, milestoneTracking.address, manufacturerSupply.address);
        await penalty.deployed();

        // Register manufacturer and create order
        await manufacturerSupply.registerManufacturer(
            manufacturer.address,
            "Test Manufacturer",
            [0] // Authorized for Engine parts
        );
    });

    describe("Penalty Operations", function () {
        it("Should calculate penalty for late delivery", async function () {
            // Create and complete an order
            await manufacturerSupply.connect(manufacturer).createOrder(
                supplier.address,
                0, // PartType.Engine
                10,
                ethers.utils.parseEther("1")
            );

            // Simulate passing of time by mining blocks with timestamp increases
            const thirtyOneDays = 31 * 24 * 60 * 60; // 31 days in seconds
            await ethers.provider.send("evm_increaseTime", [thirtyOneDays]);
            await ethers.provider.send("evm_mine");

            // Pass quality check to complete order
            await manufacturerSupply.connect(supplier).updateQualityCheck(1, 1); // QualityCheck.Passed

            const penaltyAmount = await penalty.calculateManufacturerPenalty(1);
            expect(penaltyAmount).to.be.gt(0);
        });

        it("Should not penalize on-time delivery", async function () {
            // Create and complete an order
            await manufacturerSupply.connect(manufacturer).createOrder(
                supplier.address,
                0, // PartType.Engine
                10,
                ethers.utils.parseEther("1")
            );

            // Pass quality check to complete order
            await manufacturerSupply.connect(supplier).updateQualityCheck(1, 1); // QualityCheck.Passed

            const penaltyAmount = await penalty.calculateManufacturerPenalty(1);
            expect(penaltyAmount).to.equal(0);
        });
    });
});