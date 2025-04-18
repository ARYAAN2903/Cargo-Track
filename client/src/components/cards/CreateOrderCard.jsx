import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import { ethers } from 'ethers';

const CreateOrderCard = ({ contract, cargoContract, account, setTransactionStatus }) => {
  const [supplierAddress, setSupplierAddress] = useState('');
  const [partType, setPartType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [manufacturer, setManufacturer] = useState(null);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [fixedPrice, setFixedPrice] = useState('');
  const [manufacturerOrders, setManufacturerOrders] = useState([]);

  useEffect(() => {
    const fetchManufacturerDetails = async () => {
      if (!contract || !account) return;

      try {
        const manufacturer = await contract.manufacturers(account);
        
        if (manufacturer && manufacturer.isRegistered) {
          setManufacturer({
            address: account,
            name: manufacturer.name,
          });
          setError(null);
        } else {
          throw new Error('Account not registered as manufacturer');
        }

      } catch (error) {
        console.error('Error fetching manufacturer:', error);
        setError(`Failed to load manufacturer data: ${error.message}`);
        setManufacturer(null);
      }
    };

    fetchManufacturerDetails();
  }, [contract, account]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!contract) return;
      try {
        const count = await contract.getSupplierCount();
        const suppliersList = [];
        
        for (let i = 0; i < count; i++) {
          const addr = await contract.supplierAddresses(i);
          const supplier = await contract.suppliers(addr);
          
          if (supplier.isRegistered) {
            const prices = await contract.getSupplierPrices(addr);
            suppliersList.push({
              address: addr,
              name: supplier.name,
              partPrices: prices // Prices are already in ETH
            });
          }
        }
        setSuppliers(suppliersList);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setError('Failed to load suppliers');
      }
    };

    fetchSuppliers();
  }, [contract]);

  useEffect(() => {
    const fetchManufacturerOrders = async () => {
      if (!contract || !account) return;
      try {
        const orderCount = await contract.orderCount();
        const orders = [];
        
        for (let i = 1; i <= orderCount; i++) {
          const order = await contract.orders(i);
          if (order.manufacturer.toLowerCase() === account.toLowerCase()) {
            const supplier = await contract.suppliers(order.supplier);
            
            // Get the supplier's prices array
            const prices = await contract.getSupplierPrices(order.supplier);
            // Get the actual price for this part type
            const partPrice = prices[order.partType];
            
            orders.push({
              id: i,
              supplier: order.supplier,
              supplierName: supplier.name,
              partType: Number(order.partType),
              quantity: Number(order.quantity),
              // Convert BigNumber to string before storing
              pricePerUnit: partPrice.toString(),
              status: Number(order.status)
            });
          }
        }
        setManufacturerOrders(orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchManufacturerOrders();
  }, [contract, account]);

  // Update the getPartName function to match contract's part types
  const getPartName = (partType) => {
    switch(Number(partType)) {
      case 0: return 'Engine';
      case 1: return 'Transmission';
      case 2: return 'Brake Assembly';
      default: return 'Unknown';
    }
  };

  const getOrderStatus = (status) => {
    switch(status) {
      case 0: return 'Pending';
      case 1: return 'Accepted';
      case 2: return 'ReadyForShipment';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  };

  // Update handleSupplierChange function
  const handleSupplierChange = (event) => {
    const selectedAddr = event.target.value;
    const supplier = suppliers.find(s => s.address === selectedAddr);
    setSelectedSupplier(supplier);
    setSupplierAddress(selectedAddr);
    if (partType !== '') {
      const price = supplier.partPrices[parseInt(partType)]; // Price already in ETH
      setFixedPrice(price.toString());
      setPricePerUnit(price.toString());
    }
  };

  // Update handlePartTypeChange function
  const handlePartTypeChange = async (event) => {
    const selectedPart = event.target.value;
    console.log('Selected part before setting:', selectedPart); // Debug log
    
    // Ensure we're setting the part type as a string
    setPartType(selectedPart.toString());
    
    if (selectedSupplier) {
      try {
        const prices = await contract.getSupplierPrices(selectedSupplier.address);
        const price = prices[Number(selectedPart)]; // Price already in ETH
        
        console.log('Selected price:', price); // Debug log
        setFixedPrice(price.toString());
        setPricePerUnit(price.toString());
      } catch (error) {
        console.error('Error fetching part price:', error);
        setError('Failed to fetch part price');
      }
    }
  };

  const handleCreateOrder = async () => {
    if (!contract) return;

    try {
      setError('');
      setTransactionStatus('pending');

      // Basic validation
      if (!supplierAddress || !quantity || !partType) {
        throw new Error('Please fill in all fields');
      }

      // Convert values to correct format
      const parsedQuantity = parseInt(quantity);
      const parsedPartType = parseInt(partType);

      console.log('Creating order with values:', {
        supplierAddress,
        parsedPartType,
        parsedQuantity
      });

      // Remove pricePerUnit from createOrder call since it's set in the contract
      const tx = await contract.createOrder(
        supplierAddress,
        parsedPartType,
        parsedQuantity
      );

      await tx.wait();
      setTransactionStatus('confirmed');

      // Reset form
      setSupplierAddress('');
      setPartType('');
      setQuantity('');
      setPricePerUnit('');
      
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.message || 'Failed to create order');
      setTransactionStatus('failed');
    }
  };

  // Update the getAvailableParts function to handle all part types
  const getAvailableParts = (supplierPrices) => {
    if (!supplierPrices) return [];
    
    // Return all part types (0-2) that have a price set
    return [0, 1, 2].filter(part => 
      supplierPrices[part] && supplierPrices[part].toString() !== '0'
    );
  };

  return (
    <>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ color: '#000000' }}
          >
            Create Order {manufacturer?.name ? `(${manufacturer.name})` : ''}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Supplier</InputLabel>
              <Select
                value={supplierAddress}
                label="Supplier"
                onChange={handleSupplierChange}
              >
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.address} value={supplier.address}>
                    {supplier.name} ({supplier.address})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Part Type</InputLabel>
              <Select
                value={partType}
                label="Part Type"
                onChange={handlePartTypeChange}
                disabled={!selectedSupplier} // Disable if no supplier selected
              >
                {selectedSupplier && getAvailableParts(selectedSupplier.partPrices).map((part) => (
                  <MenuItem 
                    key={part.toString()} 
                    value={part.toString()}  // Ensure value is a string
                  >
                    {getPartName(Number(part))}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
              required
              inputProps={{ min: "1" }}
            />

            <TextField
              label="Price Per Unit (ETH)"
              value={fixedPrice}
              disabled
              fullWidth
              required
              helperText="Fixed price set by supplier (ETH)"
            />

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleCreateOrder}
                disabled={!supplierAddress || !partType || !quantity}
                sx={{
                  backgroundColor: '#000000',
                  '&:hover': {
                    backgroundColor: '#333333',
                  },
                  color: '#ffffff',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 4,
                  width: '200px' // Fixed width for the button
                }}
              >
                Create Order
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </>
  );
};

export default CreateOrderCard;