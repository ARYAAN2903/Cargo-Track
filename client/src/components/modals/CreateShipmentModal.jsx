import React, { useState } from 'react';
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
  CircularProgress
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
  contract
}) => {
  const [carrier, setCarrier] = useState('');
  const [transportMode, setTransportMode] = useState(0);
  const [initialLocation, setInitialLocation] = useState('');
  const [finalLocation, setFinalLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

        {!canCreateShipment(order) ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Order must be in Ready for Shipment state to create a shipment.
            Current Status: {order ? order.status : 'Unknown'}
          </Alert>
        ) : (
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Carrier Address"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              fullWidth
              required
              placeholder="0x..."
            />

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
          <Button 
            onClick={handleCreateShipment} 
            variant="contained"
            disabled={loading || !carrier || !initialLocation || !finalLocation}
            color="primary"
          >
            {loading ? <CircularProgress size={24} /> : 'Create Shipment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateShipmentModal;