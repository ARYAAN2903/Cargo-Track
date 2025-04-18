// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ManufacturerSupply.sol";

contract CargoTracking {
    enum ShipmentStatus { 
        Created, 
        InTransit, 
        CustomsProcessing, 
        CustomsCleared, 
        Delivered 
    }
    enum TransportMode { Ocean, Air }
    enum PartType { Engine, Transmission, BrakeAssembly }

    struct Shipment {
        uint256 id;
        uint256 orderId;
        address carrier;
        PartType partType;
        TransportMode mode;
        ShipmentStatus status;
        string initialLocation;
        string finalLocation;
        string currentLocation;
        uint256 timestamp;
        bool isCustomsCleared;
        string customsNotes;
    }

    struct Carrier {
        bool isRegistered;
        string name;
        uint256 registrationDate;
        uint256[] activeShipments;
    }

    mapping(uint256 => Shipment) public shipments;
    mapping(address => Carrier) public carriers;
    address[] public carrierAddresses;
    uint256 public carrierCount;
    uint256 public shipmentIdCounter;
    address public owner;

    ManufacturerSupply public manufacturerSupply;

    uint256 private constant GAS_LIMIT = 500000;  // Increased from 300000
    uint256 private constant MAX_GAS_LIMIT = 750000;  // Increased from 750000

    event ShipmentCreated(
        uint256 shipmentId,
        uint256 orderId,
        address carrier,
        PartType partType,
        TransportMode transportMode,
        string initialLocation,
        string finalLocation
    );
    event StatusUpdated(uint256 shipmentId, ShipmentStatus status, string location);
    event CarrierRegistered(address indexed carrier, string name);
    event CustomsStatusUpdated(
        uint256 indexed shipmentId,
        bool isCleared,
        string notes
    );

    constructor(address _manufacturerSupplyAddress) {
        owner = msg.sender;
        manufacturerSupply = ManufacturerSupply(_manufacturerSupplyAddress);
        shipmentIdCounter = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyCarrier(uint256 _shipmentId) {
        require(shipments[_shipmentId].carrier == msg.sender, "Only carrier can perform this action");
        _;
    }

    function createShipment(
        uint256 _orderId,
        address _carrier,
        PartType _partType,
        TransportMode _transportMode,
        string memory _initialLocation,
        string memory _finalLocation
    ) public returns (uint256) {
        require(_orderId > 0, "Invalid order ID");
        require(_carrier != address(0), "Invalid carrier address");
        require(bytes(_initialLocation).length > 0, "Initial location cannot be empty");
        require(bytes(_finalLocation).length > 0, "Final location cannot be empty");
        require(carriers[_carrier].isRegistered, "Carrier not registered");

        (
            address manufacturer,
            address supplier,
            uint8 partType,
            uint256 quantity,
            uint256 pricePerUnit,
            ManufacturerSupply.OrderStatus status
        ) = manufacturerSupply.getOrderDetails(_orderId);

        require(supplier == msg.sender, "Only assigned supplier can create shipment");
        require(status == ManufacturerSupply.OrderStatus.ReadyForShipment, 
                "Order not ready for shipment");

        unchecked {
            shipmentIdCounter++;
        }

        Shipment storage newShipment = shipments[shipmentIdCounter];
        newShipment.id = shipmentIdCounter;
        newShipment.orderId = _orderId;
        newShipment.carrier = _carrier;
        newShipment.partType = _partType;
        newShipment.mode = _transportMode;
        newShipment.status = ShipmentStatus.Created;
        newShipment.initialLocation = _initialLocation;
        newShipment.finalLocation = _finalLocation;
        newShipment.currentLocation = _initialLocation;
        newShipment.timestamp = block.timestamp;
        newShipment.isCustomsCleared = false;

        carriers[_carrier].activeShipments.push(shipmentIdCounter);

        emit ShipmentCreated(
            shipmentIdCounter,
            _orderId,
            _carrier,
            _partType,
            _transportMode,
            _initialLocation,
            _finalLocation
        );

        return shipmentIdCounter;
    }

    function updateShipmentStatus(
        uint256 _shipmentId,
        ShipmentStatus _status,
        string memory _location
    ) public onlyCarrier(_shipmentId) {
        require(_shipmentId > 0 && _shipmentId <= shipmentIdCounter, "Invalid shipment ID");
        require(bytes(_location).length > 0, "Location cannot be empty");
        
        Shipment storage shipment = shipments[_shipmentId];
        require(isValidStatusTransition(shipment.status, _status), "Invalid status transition");
        
        if (_status == ShipmentStatus.CustomsCleared) {
            require(shipment.isCustomsCleared, "Customs clearance not verified");
        } else if (_status == ShipmentStatus.Delivered) {
            require(shipment.isCustomsCleared, "Cannot deliver: customs not cleared");
            require(keccak256(bytes(_location)) == keccak256(bytes(shipment.finalLocation)), 
                    "Delivery location must match final destination");
        }
        
        shipment.status = _status;
        shipment.currentLocation = _location;
        shipment.timestamp = block.timestamp;
        
        emit StatusUpdated(_shipmentId, _status, _location);
    }

    function updateCustomsStatus(
        uint256 _shipmentId,
        bool _isCleared,
        string memory _notes
    ) public onlyCarrier(_shipmentId) {
        Shipment storage shipment = shipments[_shipmentId];
        require(
            shipment.status == ShipmentStatus.InTransit || 
            shipment.status == ShipmentStatus.CustomsProcessing,
            "Invalid status for customs update"
        );
        
        if (_isCleared) {
            require(!shipment.isCustomsCleared, "Customs already cleared");
            shipment.status = ShipmentStatus.CustomsProcessing;
        }
        
        shipment.isCustomsCleared = _isCleared;
        shipment.customsNotes = _notes;
        shipment.timestamp = block.timestamp;
        
        emit CustomsStatusUpdated(_shipmentId, _isCleared, _notes);
    }

    function getShipment(uint256 _shipmentId) external view returns (Shipment memory) {
        require(_shipmentId > 0 && _shipmentId <= shipmentIdCounter, "Invalid shipment ID");
        return shipments[_shipmentId];
    }

    function getShipmentCount() public view returns (uint256) {
        return shipmentIdCounter;
    }

    function registerCarrier(address _carrier, string memory _name) public onlyOwner {
        require(_carrier != address(0), "Invalid carrier address");
        require(!carriers[_carrier].isRegistered, "Carrier already registered");
        
        carriers[_carrier] = Carrier({
            isRegistered: true,
            name: _name,
            registrationDate: block.timestamp,
            activeShipments: new uint256[](0)
        });

        carrierAddresses.push(_carrier);
        carrierCount++;
        
        emit CarrierRegistered(_carrier, _name);
    }

    function getCarrierCount() public view returns (uint256) {
        return carrierAddresses.length;
    }

    function isRegisteredCarrier(address _carrier) public view returns (bool) {
        return carriers[_carrier].isRegistered;
    }

    function getCarrierDetails(address _carrier) public view returns (
        bool isRegistered,
        string memory name,
        uint256 registrationDate
    ) {
        Carrier memory carrier = carriers[_carrier];
        return (carrier.isRegistered, carrier.name, carrier.registrationDate);
    }

    // Add helper function to verify status transition
    function isValidStatusTransition(ShipmentStatus _current, ShipmentStatus _new) internal pure returns (bool) {
        if (_current == ShipmentStatus.Created) {
            return _new == ShipmentStatus.InTransit;
        } else if (_current == ShipmentStatus.InTransit) {
            return _new == ShipmentStatus.CustomsProcessing;
        } else if (_current == ShipmentStatus.CustomsProcessing) {
            return _new == ShipmentStatus.CustomsCleared;
        } else if (_current == ShipmentStatus.CustomsCleared) {
            return _new == ShipmentStatus.Delivered;
        }
        return false;
    }

    // Add function to check if customs update is allowed
    function canUpdateCustoms(uint256 _shipmentId) public view returns (bool) {
        Shipment memory shipment = shipments[_shipmentId];
        return (
            shipment.status == ShipmentStatus.InTransit || 
            shipment.status == ShipmentStatus.CustomsProcessing
        );
    }

    // Add new function to get shipment payment details
    function getShipmentPaymentInfo(uint256 _shipmentId) external view returns (
        uint256 orderAmount,
        uint256 carrierFee
    ) {
        Shipment memory shipment = shipments[_shipmentId];
        
        (
            ,
            ,
            ,
            uint256 quantity,
            uint256 pricePerUnit,
            
        ) = manufacturerSupply.getOrderDetails(shipment.orderId);
        
        uint256 totalAmount = quantity * pricePerUnit;
        uint256 fee = (totalAmount * 5) / 100; // 5% carrier fee
        
        return (totalAmount, fee);
    }
}