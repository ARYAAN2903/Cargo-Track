const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CargoTracking", function () {
    let cargoTracking;
    let manufacturerSupply;
    let owner;
    let manufacturer;
    let supplier;
    let carrier;

    beforeEach(async function () {
        [owner, manufacturer, supplier, carrier] = await ethers.getSigners();

        // Deploy ManufacturerSupply first with fully qualified name
        const ManufacturerSupply = await ethers.getContractFactory("contracts/ManufacturerSupply.sol:ManufacturerSupply");
        manufacturerSupply = await ManufacturerSupply.deploy();
        await manufacturerSupply.deployed();

        // Deploy CargoTracking with ManufacturerSupply address
        const CargoTracking = await ethers.getContractFactory("CargoTracking");
        cargoTracking = await CargoTracking.deploy(manufacturerSupply.address);
        await cargoTracking.deployed();

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

    describe("Shipment Operations", function () {
        it("Should create a new shipment with order reference", async function () {
            // Create shipment
            await expect(cargoTracking.createShipment(
                1, // orderId
                carrier.address,
                0, // PartType.Engine
                0, // TransportMode.Ocean
                "Port A"
            )).to.emit(cargoTracking, "ShipmentCreated").withArgs(1, carrier.address, 0);

            const shipment = await cargoTracking.shipments(1);
            expect(shipment.orderId).to.equal(1);
            expect(shipment.carrier).to.equal(carrier.address);
            expect(shipment.partType).to.equal(0);
        });

        it("Should fail creating shipment for incomplete order", async function () {
            // Create new incomplete order
            await manufacturerSupply.connect(manufacturer).createOrder(
                supplier.address,
                0,
                10,
                ethers.utils.parseEther("1")
            );

            await expect(
                cargoTracking.createShipment(
                    2, // new orderId
                    carrier.address,
                    0,
                    0,
                    "Port A"
                )
            ).to.be.revertedWith("Order not completed");
        });
    });
});