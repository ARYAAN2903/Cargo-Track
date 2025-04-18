// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CargoTracking.sol";
import "./ManufacturerSupply.sol";

contract EscrowPayment {
    // Add owner state variable
    address public owner;
    
    CargoTracking private cargoTracking;
    ManufacturerSupply private manufacturerSupply;
    
    uint256 public constant CARRIER_FEE_PERCENTAGE = 5; // Additional 5% for carrier
    uint256 public constant SUPPLIER_PERCENTAGE = 100;  // 100% to supplier

    enum PaymentType { ManufacturerToSupplier, SupplierToCarrier }

    struct Payment {
        uint256 amount;
        PaymentType paymentType;
        bool released;
        bool refunded;
        address payable payer;
        address payable payee;
        address payable carrier;    // Added carrier address
        uint256 carrierFee;        // Added carrier fee
        uint256 supplierAmount;    // Added supplier amount
    }

    mapping(uint256 => Payment) public payments;        // shipmentId => Payment
    mapping(uint256 => Payment) public orderPayments;   // orderId => Payment

    event PaymentCreated(
        uint256 indexed id, 
        uint256 totalAmount,
        uint256 supplierAmount,
        uint256 carrierFee
    );
    event PaymentReleased(
        uint256 indexed id, 
        address supplier, 
        address carrier, 
        uint256 supplierAmount, 
        uint256 carrierFee
    );
    event PaymentRefunded(uint256 indexed id, address payer, uint256 amount);

    constructor(address _cargoTrackingAddress, address _manufacturerSupplyAddress) {
        cargoTracking = CargoTracking(_cargoTrackingAddress);
        manufacturerSupply = ManufacturerSupply(_manufacturerSupplyAddress);
        owner = msg.sender; // Set the owner in constructor
    }

    // Add onlyOwner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    // Update the createOrderPayment function to include hasPayment check
    function createOrderPayment(uint256 _orderId) external payable {
        // Add check if payment already exists
        require(orderPayments[_orderId].amount == 0, "Payment already exists");
        
        (
            address manufacturer,
            address supplier,
            uint8 partType,
            uint256 quantity,
            uint256 pricePerUnit,
            ManufacturerSupply.OrderStatus status
        ) = manufacturerSupply.getOrderDetails(_orderId);
        
        require(manufacturer == msg.sender, "Only manufacturer can create payment");
        
        // Allow payment creation for Pending and ReadyForShipment status
        require(
            status == ManufacturerSupply.OrderStatus.Pending || 
            status == ManufacturerSupply.OrderStatus.ReadyForShipment, 
            "Invalid order status"
        );
        
        uint256 orderAmount = quantity * pricePerUnit;
        uint256 carrierFee = (orderAmount * CARRIER_FEE_PERCENTAGE) / 100;
        uint256 totalAmount = orderAmount + carrierFee;
        
        require(msg.value >= totalAmount, "Insufficient payment amount");

        orderPayments[_orderId] = Payment({
            amount: msg.value,          // ETH is held in the contract
            paymentType: PaymentType.ManufacturerToSupplier,
            released: false,            // Payment not released yet
            refunded: false,
            payer: payable(msg.sender),
            payee: payable(supplier),
            carrier: payable(address(0)), // Carrier address set later
            carrierFee: carrierFee,
            supplierAmount: orderAmount
        });

        emit PaymentCreated(_orderId, msg.value, orderAmount, carrierFee);
    }

    function createShipmentPayment(uint256 _shipmentId) external payable {
        CargoTracking.Shipment memory shipment = cargoTracking.getShipment(_shipmentId);
        
        (
            address manufacturer,
            address supplier,
            uint8 partType,
            uint256 quantity,
            uint256 pricePerUnit,
            ManufacturerSupply.OrderStatus status
        ) = manufacturerSupply.getOrderDetails(shipment.orderId);
        
        require(shipment.status == CargoTracking.ShipmentStatus.Created, "Invalid shipment status");
        require(payments[_shipmentId].amount == 0, "Payment already exists");

        uint256 orderAmount = quantity * pricePerUnit;
        uint256 carrierFee = (orderAmount * CARRIER_FEE_PERCENTAGE) / 100;
        uint256 totalAmount = orderAmount + carrierFee;

        payments[_shipmentId] = Payment({
            amount: totalAmount,
            paymentType: PaymentType.ManufacturerToSupplier,
            released: false,
            refunded: false,
            payer: payable(msg.sender),
            payee: payable(supplier),
            carrier: payable(shipment.carrier),
            carrierFee: carrierFee,
            supplierAmount: orderAmount
        });

        emit PaymentCreated(_shipmentId, totalAmount, orderAmount, carrierFee);
    }

    // Add hasPayment check function
    function hasPayment(uint256 _orderId) public view returns (bool) {
        return (orderPayments[_orderId].amount > 0);
    }

    // Update releasePayment function to handle gas limit better
    function releasePayment(uint256 _shipmentId) external {
        CargoTracking.Shipment memory shipment = cargoTracking.getShipment(_shipmentId);
        Payment storage payment = payments[_shipmentId];
        Payment storage orderPayment = orderPayments[shipment.orderId];

        // Debug the status
        console.log("Shipment Status:", uint(shipment.status));
        console.log("Customs Cleared:", shipment.isCustomsCleared);

        // Check delivery status - include CustomsCleared status
        require(
            shipment.status == CargoTracking.ShipmentStatus.Delivered || 
            shipment.status == CargoTracking.ShipmentStatus.CustomsCleared, 
            "Shipment not delivered"
        );
        require(shipment.isCustomsCleared, "Customs not cleared");

        // Check payment exists
        require(orderPayment.amount > 0, "No payment found");
        require(!orderPayment.released && !orderPayment.refunded, "Payment already processed");

        // Check authorization
        require(msg.sender == orderPayment.payer || msg.sender == owner, "Unauthorized");

        // Set gas limit for transfers
        uint256 gasLimit = 30000; // Standard transfer gas limit

        // Release payment
        orderPayment.released = true;
        
        // Transfer to supplier
        (bool successSupplier,) = orderPayment.payee.call{value: orderPayment.supplierAmount, gas: gasLimit}("");
        require(successSupplier, "Supplier payment failed");
        
        // Transfer to carrier
        if (orderPayment.carrier != address(0)) {
            (bool successCarrier,) = orderPayment.carrier.call{value: orderPayment.carrierFee, gas: gasLimit}("");
            require(successCarrier, "Carrier payment failed");
        }
        
        emit PaymentReleased(
            shipment.orderId,
            orderPayment.payee,
            orderPayment.carrier,
            orderPayment.supplierAmount,
            orderPayment.carrierFee
        );
    }

    function refundPayment(uint256 _shipmentId) external {
        CargoTracking.Shipment memory shipment = cargoTracking.getShipment(_shipmentId);
        Payment storage payment = payments[_shipmentId];
        
        require(!payment.released && !payment.refunded, "Payment already processed");
        require(msg.sender == payment.payer, "Only payer can refund");
        require(
            shipment.status != CargoTracking.ShipmentStatus.Delivered && 
            !shipment.isCustomsCleared, 
            "Cannot refund completed shipment"
        );

        payment.refunded = true;
        payment.payer.transfer(payment.amount);
        
        emit PaymentRefunded(_shipmentId, payment.payer, payment.amount);
    }

    // View functions
    function getPaymentDetails(uint256 _shipmentId) external view returns (
        uint256 totalAmount,
        uint256 supplierAmount,
        uint256 carrierFee,
        bool released,
        bool refunded
    ) {
        Payment memory payment = payments[_shipmentId];
        return (
            payment.amount,
            payment.supplierAmount,
            payment.carrierFee,
            payment.released,
            payment.refunded
        );
    }

    // Add view function to get order total in ETH
    function calculateOrderTotal(uint256 _orderId) external view returns (
        uint256 orderAmount,
        uint256 carrierFee,
        uint256 totalAmount
    ) {
        (
            ,
            ,
            ,
            uint256 quantity,
            uint256 pricePerUnit,
        ) = manufacturerSupply.getOrderDetails(_orderId);
        
        orderAmount = quantity * pricePerUnit;
        carrierFee = (orderAmount * CARRIER_FEE_PERCENTAGE) / 100;
        totalAmount = orderAmount + carrierFee;
        return (orderAmount, carrierFee, totalAmount);
    }

    // Add receive() function to accept ETH
    receive() external payable {}

    // Add fallback() function to accept ETH with data
    fallback() external payable {}
}