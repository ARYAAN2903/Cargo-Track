// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CargoTracking.sol";

contract EscrowPayment {
    CargoTracking private cargoTracking;
    address private manufacturerSupplyAddress;
    uint256 public requiredDeposit;

    enum PaymentType { ManufacturerToSupplier, SupplierToCarrier }

    struct Payment {
        uint256 amount;
        PaymentType paymentType;
        bool released;
        bool refunded;
        address payable payer;
        address payable payee;
    }

    mapping(uint256 => Payment) public payments; // shipmentId => Payment
    mapping(uint256 => Payment) public orderPayments; // orderId => Payment

    event PaymentCreated(uint256 id, uint256 amount);
    event PaymentReleased(uint256 id, address payee, uint256 amount);
    event PaymentRefunded(uint256 id, address payer, uint256 amount);

    constructor(address _cargoTrackingAddress, address _manufacturerSupplyAddress, uint256 _requiredDeposit) {
        cargoTracking = CargoTracking(_cargoTrackingAddress);
        manufacturerSupplyAddress = _manufacturerSupplyAddress;
        requiredDeposit = _requiredDeposit;
    }

    function createPayment(uint256 _shipmentId) external payable {
        CargoTracking.Shipment memory shipment = cargoTracking.getShipment(_shipmentId);
        require(msg.value >= requiredDeposit, "Insufficient deposit amount");
        require(payments[_shipmentId].amount == 0, "Payment already exists");

        payments[_shipmentId] = Payment({
            amount: msg.value,
            paymentType: PaymentType.SupplierToCarrier,
            released: false,
            refunded: false,
            payer: payable(msg.sender),
            payee: payable(shipment.carrier)
        });

        emit PaymentCreated(_shipmentId, msg.value);
    }

    function createOrderPayment(uint256 _orderId) external payable {
        (bool success, bytes memory data) = manufacturerSupplyAddress.staticcall(
            abi.encodeWithSignature("getOrder(uint256)", _orderId)
        );
        require(success, "Failed to get order details");
        
        // Only decode what we need
        (
            ,  // id
            ,  // manufacturer
            address supplier,
            ,  // partType
            ,  // quantity
            ,  // pricePerUnit
            uint256 totalAmount,
            ,  // qualityStatus
            ,  // isCompleted
            // timestamp
        ) = abi.decode(data, (uint256, address, address, uint8, uint256, uint256, uint256, uint8, bool, uint256));

        require(msg.value >= totalAmount, "Insufficient payment amount");
        require(orderPayments[_orderId].amount == 0, "Payment already exists");

        orderPayments[_orderId] = Payment({
            amount: msg.value,
            paymentType: PaymentType.ManufacturerToSupplier,
            released: false,
            refunded: false,
            payer: payable(msg.sender),
            payee: payable(supplier)
        });

        emit PaymentCreated(_orderId, msg.value);
    }

    function releasePayment(uint256 _shipmentId) external {
        CargoTracking.Shipment memory shipment = cargoTracking.getShipment(_shipmentId);
        Payment storage payment = payments[_shipmentId];
        
        require(shipment.status == CargoTracking.ShipmentStatus.Delivered, "Shipment not delivered");
        require(!payment.released && !payment.refunded, "Payment already processed");
        require(msg.sender == payment.payer, "Only payer can release payment");

        payment.released = true;
        payment.payee.transfer(payment.amount);
        
        emit PaymentReleased(_shipmentId, payment.payee, payment.amount);
    }

    function refundPayment(uint256 _shipmentId) external {
        Payment storage payment = payments[_shipmentId];
        require(!payment.released && !payment.refunded, "Payment already processed");
        require(msg.sender == payment.payer, "Only payer can refund payment");

        payment.refunded = true;
        payment.payer.transfer(payment.amount);
        
        emit PaymentRefunded(_shipmentId, payment.payer, payment.amount);
    }
}