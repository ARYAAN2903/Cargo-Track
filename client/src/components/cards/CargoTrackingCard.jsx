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

const CargoTrackingCard = ({ contract, cargoContract, account, setTransactionStatus }) => {
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
      console.log('Total shipments:', shipmentCount.toString());

      const carrierShipments = [];
      for (let i = 1; i <= shipmentCount; i++) {
        try {
          const shipment = await cargoContract.shipments(i);
          if (shipment.carrier.toLowerCase() === account.toLowerCase()) {
            // Get order details to get supplier and manufacturer info
            const order = await contract.orders(shipment.orderId);
            const supplier = await contract.suppliers(order.supplier);
            const manufacturer = await contract.manufacturers(order.manufacturer);

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
              pricePerUnit: order.pricePerUnit.toString()
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
  }, [isCarrier, cargoContract, contract, account]);

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

  // Update the handleCustomsUpdate function
  const handleCustomsUpdate = async (isCleared) => {
    if (!updatingShipment || !cargoContract) {
      setError('Invalid shipment or contract not initialized');
      return;
    }
  
    try {
      setUpdating(true);
      setError(null);
      
      // Configure gas settings
      const txOptions = {
        gasLimit: ethers.utils.hexlify(3000000),
        from: account,
        gasPrice: await cargoContract.provider.getGasPrice()
      };
  
      // Update customs status first
      const customsTx = await cargoContract.updateCustomsStatus(
        updatingShipment.shipmentId,
        true, // isCleared
        "Customs verification complete ✓",
        txOptions
      );
  
      await customsTx.wait();
  
      // Then update shipment status to Customs Cleared
      const statusTx = await cargoContract.updateShipmentStatus(
        updatingShipment.shipmentId,
        3, // CustomsCleared status
        updatingShipment.currentLocation,
        txOptions
      );
  
      await statusTx.wait();
      
      // Show success message
      setTransactionStatus('Customs cleared successfully ✓');
      
      // Refresh data and close modal
      await fetchShipments();
      setIsUpdateModalOpen(false);
  
    } catch (error) {
      console.error('Customs update error:', error);
      setError(`Failed to update customs status: ${error.message}`);
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
                        </Box>
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