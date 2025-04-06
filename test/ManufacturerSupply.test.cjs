const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ManufacturerSupply", function () {
    let manufacturerSupply;
    let owner;
    let manufacturer;
    let supplier;
    
    beforeEach(async function () {
        [owner, manufacturer, supplier] = await ethers.getSigners();
        
        const ManufacturerSupply = await ethers.getContractFactory("contracts/ManufacturerSupply.sol:ManufacturerSupply");
        manufacturerSupply = await ManufacturerSupply.deploy();
        await manufacturerSupply.deployed();
    });

    describe("Manufacturer Registration", function () {
        it("Should register a manufacturer", async function () {
            await manufacturerSupply.registerManufacturer(
                manufacturer.address,
                "Test Manufacturer",
                [0] // Authorized for Engine parts
            );

            const isAuthorized = await manufacturerSupply.isAuthorizedForPart(
                manufacturer.address,
                0
            );
            expect(isAuthorized).to.be.true;
        });
    });

    describe("Order Operations", function () {
        beforeEach(async function () {
            await manufacturerSupply.registerManufacturer(
                manufacturer.address,
                "Test Manufacturer",
                [0] // Authorized for Engine parts
            );
        });

        it("Should create a new order", async function () {
            const quantity = 10;
            const pricePerUnit = ethers.utils.parseEther("1");

            await manufacturerSupply.connect(manufacturer).createOrder(
                supplier.address,
                0, // PartType.Engine
                quantity,
                pricePerUnit
            );

            const order = await manufacturerSupply.getOrder(1);
            expect(order.manufacturer).to.equal(manufacturer.address);
            expect(order.supplier).to.equal(supplier.address);
            expect(order.quantity).to.equal(quantity);
            expect(order.pricePerUnit).to.equal(pricePerUnit);
        });

        it("Should complete order after quality check passes", async function () {
            await manufacturerSupply.connect(manufacturer).createOrder(
                supplier.address,
                0,
                10,
                ethers.utils.parseEther("1")
            );

            await manufacturerSupply.connect(supplier).updateQualityCheck(
                1,
                1 // QualityCheck.Passed
            );

            const order = await manufacturerSupply.getOrder(1);
            expect(order.isCompleted).to.be.true;
        });
    });
});