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
  CircularProgress,
} from '@mui/material';
import { ethers } from 'ethers';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ReceivedOrders from '../tables/ReceivedOrders';

const CreateOrderCard = ({ contract, cargoContract, account, setTransactionStatus }) => {
  const [supplierAddress, setSupplierAddress] = useState('');
  const [partType, setPartType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [fixedPrice, setFixedPrice] = useState('');
  const [manufacturerOrders, setManufacturerOrders] = useState([]);

  useEffect(() => {
    const fetchManufacturerDetails = async () => {
      if (!contract || !account) return;

      try {
        setLoading(true);
        
        // Get manufacturer data from contract
        const manufacturer = await contract.manufacturers(account);
        
        if (manufacturer && manufacturer.isRegistered) {
          // Get registration event to get authorized parts
          const eventFilter = contract.filters.ManufacturerRegistered(account);
          const events = await contract.queryFilter(eventFilter);
          
          if (events.length > 0) {
            const registrationEvent = events[0];
            const authorizedParts = registrationEvent.args[2].map(part => Number(part));
            
            console.log('Manufacturer authorized parts:', authorizedParts);

            setManufacturer({
              address: account,
              name: manufacturer.name,
              authorizedParts: authorizedParts
            });
            setError(null);
          } else {
            throw new Error('Registration event not found');
          }
        } else {
          throw new Error('Account not registered as manufacturer');
        }

      } catch (error) {
        console.error('Error fetching manufacturer:', error);
        setError(`Failed to load manufacturer data: ${error.message}`);
        setManufacturer(null);
      } finally {
        setLoading(false);
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
            // Get prices using the getSupplierPrices function
            const prices = await contract.getSupplierPrices(addr);
            suppliersList.push({
              address: addr,
              name: supplier.name,
              partPrices: prices ? prices.map(price => ethers.utils.formatEther(price)) : []
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
      // Get price directly from supplier's prices array
      const price = supplier.partPrices[parseInt(partType)];
      setFixedPrice(price);
      setPricePerUnit(price);
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
        const selectedPrice = prices[Number(selectedPart)];
        
        console.log('Selected price:', selectedPrice.toString()); // Debug log
        setFixedPrice(selectedPrice.toString());
        setPricePerUnit(selectedPrice.toString());
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

  // Update the getAvailableParts function
  const getAvailableParts = (manufacturerParts, supplierPrices) => {
    if (!manufacturerParts || !supplierPrices) return [];
    
    // Convert manufacturerParts to numbers and filter only valid part types (0-2)
    const authorizedParts = manufacturerParts
      .map(part => Number(part))
      .filter(part => part >= 0 && part < 3);
    
    // Return only the parts that are both authorized and have a price
    return authorizedParts.filter(part => 
      supplierPrices[part] && supplierPrices[part].toString() !== '0'
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create Order {manufacturer?.name ? `(${manufacturer.name})` : ''}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {manufacturer?.authorizedParts && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Your authorized parts: {manufacturer.authorizedParts.map(getPartName).join(', ')}
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
                {manufacturer?.authorizedParts?.map((part) => (
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
              value={fixedPrice} // Remove Number() conversion
              disabled
              fullWidth
              required
              helperText="Fixed price set by supplier"
            />

            <Button
              variant="contained"
              onClick={handleCreateOrder}
              disabled={!supplierAddress || !partType || !quantity}
              fullWidth
            >
              Create Order
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Orders
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Supplier Name</TableCell>
                  <TableCell>Part Type</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Price/Unit (ETH)</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manufacturerOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>{getPartName(order.partType)}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.pricePerUnit} ETH
                    </TableCell>
                    <TableCell>{getOrderStatus(order.status)}</TableCell>
                  </TableRow>
                ))}
                {manufacturerOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <ReceivedOrders 
        contract={contract}
        cargoContract={cargoContract}
        account={account}
      />
    </>
  );
};

export default CreateOrderCard;