import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  FormHelperText,
  Typography
} from '@mui/material';
import { ethers } from 'ethers';

const OrderStatus = {
  Pending: 0,
  Accepted: 1,
  ReadyForShipment: 2,
  Rejected: 3
};

const CreateShipmentModal = ({ 
  open, 
  onClose, 
  order,
  cargoContract,
  onShipmentCreated,
  account,
  contract,
  ordersWithShipments = [], // Add default empty array
  handleShipmentCreation
}) => {
  const [carrier, setCarrier] = useState('');
  const [transportMode, setTransportMode] = useState(0);
  const [initialLocation, setInitialLocation] = useState('');
  const [finalLocation, setFinalLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [carriers, setCarriers] = useState([]);
  const [loadingCarriers, setLoadingCarriers] = useState(true);

  const getOrderStatus = (status) => {
    switch (Number(status)) {
      case OrderStatus.Pending:
        return 'Pending';
      case OrderStatus.Accepted:
        return 'Accepted';
      case OrderStatus.ReadyForShipment:
        return success ? 'Shipment Created' : 'Ready for Shipment';
      case OrderStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  useEffect(() => {
    const fetchCarriers = async () => {
      if (!cargoContract) return;
      
      try {
        setLoadingCarriers(true);
        const carrierCount = await cargoContract.carrierCount();
        const fetchedCarriers = [];
        
        for (let i = 0; i < carrierCount; i++) {
          const carrierAddress = await cargoContract.carrierAddresses(i);
          const carrier = await cargoContract.carriers(carrierAddress);
          
          if (carrier.isRegistered) {
            fetchedCarriers.push({
              address: carrierAddress,
              name: carrier.name
            });
          }
        }
        
        setCarriers(fetchedCarriers);
      } catch (error) {
        console.error('Error fetching carriers:', error);
        setError('Failed to load carriers');
      } finally {
        setLoadingCarriers(false);
      }
    };

    fetchCarriers();
  }, [cargoContract]);

  // Update the initiateShipment function
  const initiateShipment = async () => {
    try {
      console.log('Current order status:', Number(order.status));
      
      // Only initiate if order is in Accepted state
      if (Number(order.status) === OrderStatus.Accepted) {
        console.log('Initiating shipment transaction...');
        const tx = await contract.initiateShipment(order.id, { from: account });
        console.log('Waiting for transaction confirmation...');
        await tx.wait();
        
        // Verify the new status
        const updatedOrder = await contract.orders(order.id);
        console.log('Updated order status:', Number(updatedOrder.status));
        
        if (Number(updatedOrder.status) !== OrderStatus.ReadyForShipment) {
          throw new Error('Order status not updated correctly');
        }
      } else if (Number(order.status) === OrderStatus.ReadyForShipment) {
        console.log('Order already in ReadyForShipment state');
        return; // Order is already in correct state
      } else {
        throw new Error(`Invalid order status: ${order.status}. Must be Accepted or ReadyForShipment`);
      }
    } catch (err) {
      console.error('Initiate shipment error:', err);
      throw new Error(`Failed to prepare order for shipment: ${err.message}`);
    }
  };

  const canCreateShipment = (order) => {
    const status = Number(order?.status);
    return order && (status === OrderStatus.Accepted || status === OrderStatus.ReadyForShipment);
  };

  const handleCreateShipment = async () => {
    if (!carrier || !initialLocation || !finalLocation) {
        setError('Please fill all required fields');
        return;
    }

    try {
        setLoading(true);
        setError('');
        setSuccess(false);

        // First, initiate the shipment to change order status
        console.log('Initiating shipment for order:', order.id);
        await initiateShipment();

        // Verify order status again after initiation
        const orderInfo = await contract.orders(order.id);
        console.log('Order Status after initiation:', Number(orderInfo.status));

        if (Number(orderInfo.status) !== OrderStatus.ReadyForShipment) {
            throw new Error('Failed to prepare order for shipment');
        }

        const orderId = order.id;
        const carrierAddress = ethers.utils.getAddress(carrier);
        const partTypeId = order.partType;
        const transportModeId = transportMode;

        console.log('Creating shipment with parameters:', {
            orderId,
            carrierAddress,
            partTypeId,
            transportModeId,
            initialLocation,
            finalLocation
        });

        const txOptions = {
            gasLimit: ethers.utils.hexlify(3000000),
            from: account,
            gasPrice: await cargoContract.provider.getGasPrice()
        };

        // Create the shipment after successful initiation
        const tx = await cargoContract.createShipment(
            orderId,
            carrierAddress,
            partTypeId,
            transportModeId,
            initialLocation,
            finalLocation,
            txOptions
        );

        console.log('Shipment creation transaction hash:', tx.hash);
        const receipt = await tx.wait();
        console.log('Shipment creation confirmed:', receipt);

        setSuccess(true); // Set success state
        
        // Wait for 2 seconds to show success message before closing
        setTimeout(() => {
            onShipmentCreated();
            onClose();
        }, 2000);

    } catch (err) {
        console.error('Transaction Error:', err);
        setError(err.message || 'Transaction failed. Please check console for details.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Shipment for Order #{order?.id}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Shipment created successfully! ✓
          </Alert>
        )}

        {!canCreateShipment(order) && !success ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Order must be accepted to create a shipment.
            Current Status: {order ? getOrderStatus(order.status) : 'Unknown'}
          </Alert>
        ) : (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Select Carrier</InputLabel>
              <Select
                value={carrier}
                label="Select Carrier"
                onChange={(e) => setCarrier(e.target.value)}
                disabled={loadingCarriers}
                sx={{ textAlign: 'left' }}
              >
                {loadingCarriers ? (
                  <MenuItem disabled>Loading carriers...</MenuItem>
                ) : carriers.length === 0 ? (
                  <MenuItem disabled>No registered carriers found</MenuItem>
                ) : (
                  carriers.map((carrier) => (
                    <MenuItem key={carrier.address} value={carrier.address}>
                      {carrier.name} ({carrier.address.slice(0, 6)}...{carrier.address.slice(-4)})
                    </MenuItem>
                  ))
                )}
              </Select>
              <FormHelperText>
                {loadingCarriers ? 'Loading carriers...' : 'Select a registered carrier'}
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Transport Mode</InputLabel>
              <Select
                value={transportMode}
                label="Transport Mode"
                onChange={(e) => setTransportMode(e.target.value)}
              >
                <MenuItem value={0}>Ocean</MenuItem>
                <MenuItem value={1}>Air</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Pickup Location (Supplier)"
              value={initialLocation}
              onChange={(e) => setInitialLocation(e.target.value)}
              fullWidth
              required
              placeholder="Enter supplier's location"
            />

            <TextField
              label="Delivery Location (Manufacturer)"
              value={finalLocation}
              onChange={(e) => setFinalLocation(e.target.value)}
              fullWidth
              required
              placeholder="Enter manufacturer's location"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {canCreateShipment(order) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.isArray(ordersWithShipments) && !ordersWithShipments.includes(order?.id) ? (
              <Button
                variant="contained"
                onClick={handleCreateShipment}
                disabled={loading || !carrier || !initialLocation || !finalLocation}
                sx={{
                  backgroundColor: '#000000',
                  '&:hover': {
                    backgroundColor: '#333333',
                  },
                  color: '#ffffff',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  py: 0.5,
                  px: 3,
                  minWidth: '140px',
                  height: '32px'
                }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'Create Shipment'
                )}
              </Button>
            ) : (
              <Typography 
                variant="body2" 
                color="success.main" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}
              >
                ✓ Shipment Created
              </Typography>
            )}
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateShipmentModal;