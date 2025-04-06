const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MilestoneTracking", function () {
    let cargoTracking;
    let manufacturerSupply;
    let milestoneTracking;
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

        const MilestoneTracking = await ethers.getContractFactory("MilestoneTracking");
        milestoneTracking = await MilestoneTracking.deploy(
            cargoTracking.address,
            manufacturerSupply.address
        );
        await milestoneTracking.deployed();

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

        // Create shipment
        await cargoTracking.createShipment(
            1, // orderId
            carrier.address,
            0, // PartType.Engine
            0, // TransportMode.Ocean
            "Port A"
        );
    });

    describe("Milestone Operations", function () {
        it("Should update milestone status", async function () {
            await milestoneTracking.connect(manufacturer).updateOrderMilestone(
                1, // orderId
                0, // MilestoneType.OrderPlaced
                1, // MilestoneStatus.Completed
                "Order placed successfully"
            );

            const milestone = await milestoneTracking.getOrderMilestone(1, 0);
            expect(milestone.status).to.equal(1);
        });

        it("Should fail when non-carrier tries to update milestone", async function () {
            await expect(
                milestoneTracking.connect(owner).updateOrderMilestone(
                    1, // orderId
                    0, // MilestoneType.OrderPlaced
                    1, // MilestoneStatus.Completed
                    "Order placed successfully"
                )
            ).to.be.revertedWith("Unauthorized");
        });
    });
});