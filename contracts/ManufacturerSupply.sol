// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ManufacturerSupply {
    uint256 private constant MAX_GAS = 750000;
    uint8 private constant MAX_PART_TYPE = 5;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    struct Manufacturer {
        string name;
        uint8[] authorizedParts;
        bool isRegistered;
    }

    struct Supplier {
        bool isRegistered;      // index 0
        string name;           // index 1
        uint256[3] partPrices; // index 2
        uint256 registrationDate; // index 3
    }

    mapping(address => Manufacturer) public manufacturers;
    mapping(address => Supplier) public suppliers;
    address[] public manufacturerAddresses;
    uint256 public manufacturerCount;
    address[] public supplierAddresses;
    uint256 public supplierCount;

    event ManufacturerRegistered(
        address indexed manufacturerAddress,
        string name,
        uint8[] authorizedParts
    );

    event SupplierRegistered(
        address indexed supplierAddress,
        string name,
        uint256[3] partPrices
    );

    function registerManufacturer(
        address _manufacturerAddress,
        string memory _name,
        uint8[] memory _authorizedParts
    ) public onlyOwner {
        require(_manufacturerAddress != address(0), "Invalid manufacturer address");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(_authorizedParts.length > 0, "Must authorize at least one part");
        require(!manufacturers[_manufacturerAddress].isRegistered, "Manufacturer already registered");

        for(uint i = 0; i < _authorizedParts.length; i++) {
            require(_authorizedParts[i] <= MAX_PART_TYPE, "Invalid part type");
        }

        manufacturers[_manufacturerAddress] = Manufacturer({
            name: _name,
            authorizedParts: _authorizedParts,
            isRegistered: true
        });

        manufacturerAddresses.push(_manufacturerAddress);
        manufacturerCount++;

        emit ManufacturerRegistered(_manufacturerAddress, _name, _authorizedParts);
    }

    function registerSupplier(
        address _supplier, 
        string memory _name,
        uint256[3] memory _partPrices
    ) public onlyOwner {
        require(_supplier != address(0), "Invalid supplier address");
        require(!suppliers[_supplier].isRegistered, "Supplier already registered");
        require(_partPrices[0] > 0 && _partPrices[1] > 0 && _partPrices[2] > 0, "Invalid prices");
        
        suppliers[_supplier] = Supplier({
            isRegistered: true,
            name: _name,
            registrationDate: block.timestamp,
            partPrices: _partPrices
        });
        
        supplierAddresses.push(_supplier);
        supplierCount++;
        
        emit SupplierRegistered(_supplier, _name, _partPrices);
    }

    function getSupplierCount() public view returns (uint256) {
        return supplierAddresses.length;
    }

    function getSupplierPrices(address _supplier) public view returns (uint256[3] memory) {
        require(suppliers[_supplier].isRegistered, "Supplier not registered");
        return suppliers[_supplier].partPrices;
    }

    function isRegisteredSupplier(address _supplier) public view returns (bool) {
        return suppliers[_supplier].isRegistered;
    }

    function getManufacturerCount() public view returns (uint256) {
        return manufacturerAddresses.length;
    }

    enum OrderStatus {
        Pending,
        Accepted,
        ReadyForShipment,
        Rejected
    }

    struct Order {
        address manufacturer;
        address supplier;
        uint8 partType;
        uint256 quantity;
        uint256 pricePerUnit;
        OrderStatus status;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed manufacturer,
        address supplier,
        uint8 partType,
        uint256 quantity,
        uint256 pricePerUnit
    );

    event OrderAccepted(uint256 indexed orderId, address indexed supplier);
    event ShipmentInitiated(uint256 indexed orderId);

    function createOrder(
        address _supplier,
        uint8 _partType,
        uint256 _quantity
    ) public {
        require(manufacturers[msg.sender].isRegistered, "Only registered manufacturers can create orders");
        require(_supplier != msg.sender, "Cannot supply to yourself");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(suppliers[_supplier].isRegistered, "Supplier must be registered");
        require(_partType < 3, "Invalid part type");

        uint256 fixedPrice = suppliers[_supplier].partPrices[_partType];
        require(fixedPrice > 0, "Part price not set by supplier");

        bool isAuthorized = false;
        uint8[] memory authorizedParts = manufacturers[msg.sender].authorizedParts;
        for(uint i = 0; i < authorizedParts.length; i++) {
            if(authorizedParts[i] == _partType) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Not authorized for this part type");

        orderCount++;
        orders[orderCount] = Order({
            manufacturer: msg.sender,
            supplier: _supplier,
            partType: _partType,
            quantity: _quantity,
            pricePerUnit: fixedPrice,
            status: OrderStatus.Pending
        });

        emit OrderCreated(
            orderCount,
            msg.sender,
            _supplier,
            _partType,
            _quantity,
            fixedPrice
        );
    }

    function acceptOrder(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(order.supplier == msg.sender, "Only the assigned supplier can accept this order");
        require(order.status == OrderStatus.Pending, "Order is not in Pending state");
        order.status = OrderStatus.Accepted;
        emit OrderAccepted(_orderId, msg.sender);
    }

    function initiateShipment(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(order.supplier == msg.sender, "Only the assigned supplier can initiate shipment");
        require(order.status == OrderStatus.Accepted, "Order must be accepted first");
        order.status = OrderStatus.ReadyForShipment;
        emit ShipmentInitiated(_orderId);
    }

    function getOrderCount() public view returns (uint256) {
        return orderCount;
    }
}