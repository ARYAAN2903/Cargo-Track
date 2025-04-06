import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { ethers } from 'ethers';

const ReceivedOrders = ({ contract, cargoContract, account }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!contract || !account || !cargoContract) return;

    try {
      const orderCount = await contract.orderCount();
      const ordersArray = [];

      for (let i = 1; i <= orderCount; i++) {
        const order = await contract.orders(i);
        if (order.manufacturer.toLowerCase() === account.toLowerCase() && 
            Number(order.status) === 2) { // Delivered status
          
          // Get shipment details
          const shipment = await cargoContract.shipments(i);
          // Get supplier details
          const supplier = await contract.suppliers(order.supplier);
          // Get carrier details
          const carrier = await cargoContract.carriers(shipment.carrier);

          ordersArray.push({
            id: i,
            partType: Number(order.partType),
            quantity: Number(order.quantity),
            pricePerUnit: order.pricePerUnit,
            totalPrice: order.pricePerUnit.mul(order.quantity),
            supplier: {
              name: supplier.name,
              address: order.supplier
            },
            carrier: {
              name: carrier.name,
              address: shipment.carrier
            },
            locations: {
              initial: shipment.initialLocation,
              final: shipment.finalLocation
            }
          });
        }
      }

      setOrders(ordersArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching received orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [contract, cargoContract, account]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getPartName = (partType) => {
    switch(partType) {
      case 0: return 'Engine';
      case 1: return 'Transmission';
      case 2: return 'Brake Assembly';
      default: return 'Unknown';
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Received Orders
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Order ID</TableCell>
              <TableCell>Parts Requested</TableCell>
              <TableCell>Total Price (ETH)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>
                  {`${getPartName(order.partType)} (${order.quantity} units)`}
                </TableCell>
                <TableCell>
                  {ethers.utils.formatEther(order.totalPrice)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      setSelectedOrder(order);
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

      <Dialog 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Order Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Typography>Order ID: {selectedOrder.id}</Typography>
                <Typography>Part Type: {getPartName(selectedOrder.partType)}</Typography>
                <Typography>Quantity: {selectedOrder.quantity} units</Typography>
                <Typography>Price/Unit: {ethers.utils.formatEther(selectedOrder.pricePerUnit)} ETH</Typography>
                <Typography>Total Price: {ethers.utils.formatEther(selectedOrder.totalPrice)} ETH</Typography>
              </Box>

              <Typography variant="h6" gutterBottom>Delivery Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography>Supplier: {selectedOrder.supplier.name} ({selectedOrder.supplier.address.slice(0,6)}...)</Typography>
                <Typography>Carrier: {selectedOrder.carrier.name} ({selectedOrder.carrier.address.slice(0,6)}...)</Typography>
                <Typography>From: {selectedOrder.locations.initial}</Typography>
                <Typography>To: {selectedOrder.locations.final}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReceivedOrders;