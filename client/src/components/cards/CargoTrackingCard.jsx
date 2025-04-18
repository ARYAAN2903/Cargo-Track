import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Chip,
  Box,
  CircularProgress,
  Alert,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import { ethers } from 'ethers';

const getDisabledStatuses = (currentStatus) => {
  const usedStatuses = new Set();
  
  // Add all previous statuses to disabled set
  for (let i = 0; i <= currentStatus; i++) {
    usedStatuses.add(i);
  }
  
  // Always disable "Created" status as it's initial
  usedStatuses.add(0);
  
  return usedStatuses;
};

const CargoTrackingCard = ({ contract, cargoContract, escrowContract, account, setTransactionStatus }) => {
  const [isCarrier, setIsCarrier] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updatingShipment, setUpdatingShipment] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [updating, setUpdating] = useState(false);

  // Update the fetchShipments callback to properly structure shipment data
  const fetchShipments = useCallback(async () => {
    if (!isCarrier || !cargoContract || !account) return;

    try {
      const shipmentCount = await cargoContract.getShipmentCount();
      const carrierShipments = [];

      for (let i = 1; i <= shipmentCount; i++) {
        try {
          const shipment = await cargoContract.shipments(i);
          if (shipment.carrier.toLowerCase() === account.toLowerCase()) {
            const order = await contract.orders(shipment.orderId);
            const supplier = await contract.suppliers(order.supplier);
            const manufacturer = await contract.manufacturers(order.manufacturer);
            
            // Get both payment types
            const payment = await escrowContract.payments(i);
            const orderPayment = await escrowContract.orderPayments(shipment.orderId);

            // Calculate the actual carrier fee from the order amount
            const orderAmount = Number(order.quantity) * Number(order.pricePerUnit);
            const carrierFee = orderAmount * 0.05; // 5% carrier fee

            carrierShipments.push({
              shipmentId: i,
              orderId: shipment.orderId.toString(),
              supplierName: supplier.name || 'Unknown',
              supplierAddress: order.supplier || '',
              manufacturerName: manufacturer.name || 'Unknown',
              manufacturerAddress: order.manufacturer || '',
              status: Number(shipment.status),
              currentLocation: shipment.currentLocation,
              initialLocation: shipment.initialLocation,
              finalLocation: shipment.finalLocation,
              isCustomsCleared: shipment.isCustomsCleared,
              partType: Number(order.partType),
              quantity: Number(order.quantity),
              pricePerUnit: order.pricePerUnit.toString(),
              paymentStatus: {
                isPaid: orderPayment.amount > 0 || payment.amount > 0,
                isReleased: orderPayment.released || payment.released,
                isRefunded: orderPayment.refunded || payment.refunded,
                carrierFee: orderPayment.released || payment.released ? 
                           carrierFee.toString() : // Show actual fee when released
                           ethers.utils.formatEther(orderPayment.carrierFee || payment.carrierFee) // Show pending fee
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching shipment ${i}:`, error);
        }
      }

      setShipments(carrierShipments);
      setError(null);

    } catch (error) {
      console.error('Error fetching shipments:', error);
      setError('Failed to load shipments');
    }
  }, [isCarrier, cargoContract, contract, escrowContract, account]);

  // Check carrier status
  useEffect(() => {
    const checkCarrierStatus = async () => {
      if (!cargoContract || !account) {
        console.log('Dependencies not ready:', {
          hasContract: Boolean(cargoContract),
          account: account
        });
        return;
      }

      try {
        const carrierInfo = await cargoContract.carriers(account);
        console.log('Carrier info:', carrierInfo);
        setIsCarrier(carrierInfo.isRegistered);

        if (carrierInfo.isRegistered) {
          // Fetch shipments only if carrier is verified
          await fetchShipments();
        }
      } catch (error) {
        console.error('Error checking carrier status:', error);
        setError('Failed to verify carrier status');
        setIsCarrier(false);
      } finally {
        setLoading(false);
      }
    };

    checkCarrierStatus();
  }, [cargoContract, account, fetchShipments]);

  // Update the getStatusChip function
  const getStatusChip = (status) => {
    const statusColors = {
      0: 'default',  // Created
      1: 'primary',  // InTransit
      2: 'info',     // CustomsCleared
      3: 'success'   // Delivered
    };

    const statusText = {
      0: 'Created',
      1: 'In Transit',
      2: 'Customs Cleared ✓',
      3: '✅ Delivered Successfully'
    };

    return (
      <Chip 
        label={statusText[status]} 
        color={statusColors[status]}
        size="small"
        sx={status === 3 ? { 
          backgroundColor: '#4caf50',
          color: 'white',
          fontWeight: 'bold'
        } : {}}
      />
    );
  };

  // Add payment status chip component
  const getPaymentStatusChip = (paymentStatus) => {
    if (paymentStatus.isRefunded) {
      return <Chip label="Refunded" color="error" size="small" />;
    }
    if (paymentStatus.isReleased) {
      return (
        <Box>
          <Chip label="Payment Released ✓" color="success" size="small" />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Received: {Number(paymentStatus.carrierFee).toFixed(4)} ETH
          </Typography>
        </Box>
      );
    }
    if (paymentStatus.isPaid) {
      return (
        <Box>
          <Chip label="Paid (In Escrow)" color="primary" size="small" />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Pending: {Number(paymentStatus.carrierFee).toFixed(4)} ETH
          </Typography>
        </Box>
      );
    }
    return <Chip label="Unpaid" color="warning" size="small" />;
  };

  // Add this helper function after getPaymentStatusChip
  const getTransactionDetails = (paymentStatus) => {
    if (paymentStatus.isReleased) {
      return (
        <Box>
          <Typography variant="body2" color="success.main">
            Fee Received: {Number(paymentStatus.carrierFee).toFixed(4)} ETH
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            (5% of order value)
          </Typography>
        </Box>
      );
    }
    if (paymentStatus.isPaid) {
      return (
        <Box>
          <Typography variant="body2" color="info.main">
            Pending Fee: {Number(paymentStatus.carrierFee).toFixed(4)} ETH
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Will be released on delivery
          </Typography>
        </Box>
      );
    }
    return (
      <Typography variant="body2" color="text.secondary">
        No transaction yet
      </Typography>
    );
  };

  // Update the handleCustomsUpdate function
  const handleCustomsUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
  
      // First update customs status
      const customsTx = await cargoContract.updateCustomsStatus(
        updatingShipment.shipmentId,
        true,
        "Customs verification complete ✓",
        { from: account }
      );
      await customsTx.wait();
  
      // Then update to Delivered status with final location
      const deliveryTx = await cargoContract.updateShipmentStatus(
        updatingShipment.shipmentId,
        3, // Delivered status
        updatingShipment.finalLocation, // Use final destination
        { from: account }
      );
      await deliveryTx.wait();
  
      await fetchShipments();
      setIsUpdateModalOpen(false);
      setTransactionStatus('Delivery completed successfully ✓');
  
    } catch (error) {
      console.error('Update error:', error);
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };
  
  // Update the handleStatusUpdate function to handle customs status properly
  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
  
      // For customs cleared status, use the customs update flow
      if (newStatus === 3) {
        await handleCustomsUpdate(true);
        return;
      }
  
      const txOptions = {
        gasLimit: ethers.utils.hexlify(4000000),
        from: account,
        gasPrice: await cargoContract.provider.getGasPrice()
      };
  
      const tx = await cargoContract.updateShipmentStatus(
        updatingShipment.shipmentId,
        newStatus,
        newLocation,
        txOptions
      );
  
      await tx.wait();
      await fetchShipments();
      setIsUpdateModalOpen(false);
      setTransactionStatus('Status updated successfully');
  
    } catch (error) {
      console.error('Status update error:', error);
      setError(`Failed to update status: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomsClearance = async () => {
    try {
      setError('');
      setUpdating(true);
  
      const txOptions = {
        gasLimit: ethers.utils.hexlify(3000000),
        from: account,
        gasPrice: await cargoContract.provider.getGasPrice()
      };
  
      // First clear customs
      const customsTx = await cargoContract.updateCustomsStatus(
        updatingShipment.shipmentId,
        true, // isCleared
        "Customs verification complete",
        txOptions
      );
      await customsTx.wait();
  
      // Then update status
      const statusTx = await cargoContract.updateShipmentStatus(
        updatingShipment.shipmentId,
        newStatus,
        newLocation,
        txOptions
      );
      await statusTx.wait();
  
      fetchShipments();
      setIsUpdateModalOpen(false);
      setTransactionStatus('Shipment status and customs cleared successfully');
    } catch (error) {
      console.error('Error processing customs:', error);
      setError('Failed to process customs: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Keep the main return with the table
  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            My Shipments
          </Typography>
          
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Shipment ID</TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell>From (Supplier)</TableCell>
                    <TableCell>To (Manufacturer)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment Status</TableCell>
                    <TableCell>Fee Transaction</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.shipmentId}>
                      <TableCell>{shipment.shipmentId}</TableCell>
                      <TableCell>{shipment.orderId}</TableCell>
                      <TableCell>
                        {shipment.supplierAddress ? 
                          `${shipment.supplierName || 'Unknown'} (${shipment.supplierAddress.slice(0,6)}...)` : 
                          'Loading...'
                        }
                      </TableCell>
                      <TableCell>
                        {shipment.manufacturerAddress ? 
                          `${shipment.manufacturerName || 'Unknown'} (${shipment.manufacturerAddress.slice(0,6)}...)` : 
                          'Loading...'
                        }
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusChip(shipment.status)}
                          {shipment.status !== 3 && (  // Only show button if not delivered
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => {
                                setUpdatingShipment(shipment);
                                setNewLocation(shipment.currentLocation);
                                setNewStatus(shipment.status);
                                setIsUpdateModalOpen(true);
                              }}
                            >
                              Update
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusChip(shipment.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        {getTransactionDetails(shipment.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setIsModalOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Shipment Details #{selectedShipment?.shipmentId}
        </DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Order Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Typography>Order ID: {selectedShipment.orderId}</Typography>
                <Typography>Part Type: {getPartName(selectedShipment.partType)}</Typography>
                <Typography>Quantity: {selectedShipment.quantity}</Typography>
                <Typography>Price/Unit: {selectedShipment.pricePerUnit} ETH</Typography>
                <Typography>Total Price: {(Number(selectedShipment.pricePerUnit) * Number(selectedShipment.quantity)).toFixed(4)} ETH</Typography>
              </Box>

              <Typography variant="h6" gutterBottom>Shipping Details</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography>From: {selectedShipment.initialLocation}</Typography>
                <Typography>To: {selectedShipment.finalLocation}</Typography>
                <Typography>Current Location: {selectedShipment.currentLocation}</Typography>
                <Typography>Status: {getStatusChip(selectedShipment.status)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Shipment Status #{updatingShipment?.shipmentId}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {[
                  { value: 0, label: 'Created' },
                  { value: 1, label: 'In Transit' },
                  { value: 2, label: 'Customs Cleared' },
                  { value: 3, label: 'Delivered' }
                ].map((status) => (
                  <MenuItem 
                    key={status.value} 
                    value={status.value}
                    disabled={getDisabledStatuses(updatingShipment?.status).has(status.value)}
                  >
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Current Location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUpdateModalOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={handleStatusUpdate} disabled={updating}>
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const getPartName = (partType) => {
  switch(partType) {
    case 0: return 'Engine';
    case 1: return 'Transmission';
    case 2: return 'Brake Assembly';
    default: return 'Unknown';
  }
};

export default CargoTrackingCard;