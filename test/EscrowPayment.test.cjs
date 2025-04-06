const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowPayment", function () {
    let cargoTracking;
    let manufacturerSupply;
    let escrowPayment;
    let owner;
    let manufacturer;
    let supplier;
    let carrier;

    beforeEach(async function () {
        [owner, manufacturer, supplier, carrier] = await ethers.getSigners();

        // Deploy contracts
        const ManufacturerSupply = await ethers.getContractFactory("contracts/ManufacturerSupply.sol:ManufacturerSupply");
        manufacturerSupply = await ManufacturerSupply.deploy();
        await manufacturerSupply.deployed();

        const CargoTracking = await ethers.getContractFactory("CargoTracking");
        cargoTracking = await CargoTracking.deploy(manufacturerSupply.address);
        await cargoTracking.deployed();

        const EscrowPayment = await ethers.getContractFactory("EscrowPayment");
        escrowPayment = await EscrowPayment.deploy(
            cargoTracking.address,
            manufacturerSupply.address,
            ethers.utils.parseEther("1.0") // Required deposit
        );
        await escrowPayment.deployed();

        // Register manufacturer and create order
        await manufacturerSupply.registerManufacturer(
            manufacturer.address,
            "Test Manufacturer",
            [0] // Authorized for Engine parts
        );

        // Create and complete an order
        await manufacturerSupply.connect(manufacturer).createOrder(
            supplier.address,
            0, // PartType.Engine
            10,
            ethers.utils.parseEther("1")
        );

        // Pass quality check to complete order
        await manufacturerSupply.connect(supplier).updateQualityCheck(1, 1); // QualityCheck.Passed
    });

    describe("Payment Operations", function () {
        it("Should create manufacturer payment", async function () {
            const orderAmount = ethers.utils.parseEther("10"); // 10 units * 1 ETH
            await expect(
                escrowPayment.connect(manufacturer).createOrderPayment(1, {
                    value: orderAmount
                })
            ).to.emit(escrowPayment, "PaymentCreated")
             .withArgs(1, orderAmount);
        });
    });
});