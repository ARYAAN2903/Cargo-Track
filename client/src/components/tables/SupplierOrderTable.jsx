import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { ethers } from 'ethers';
import CreateShipmentModal from '../modals/CreateShipmentModal';

const OrderStatus = {
  Pending: 0,
  Accepted: 1,
  ReadyForShipment: 2,
  Rejected: 3
};

const SupplierOrderTable = ({ contract, cargoContract, account }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegisteredSupplier, setIsRegisteredSupplier] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [ordersWithShipments, setOrdersWithShipments] = useState([]);

  const fetchOrders = async () => {
    if (!contract || !account) return;

    try {
      const orderCount = await contract.orderCount();
      const ordersArray = [];
      const shipmentsArray = [];

      for (let i = 1; i <= orderCount; i++) {
        const order = await contract.orders(i);
        if (order.supplier.toLowerCase() === account.toLowerCase()) {
          try {
            // Check if shipment exists by trying to get its details
            const shipment = await cargoContract.shipments(i);
            // If shipment exists and has valid data
            if (shipment && shipment.orderId.toString() !== '0') {
              shipmentsArray.push(i);
            }
          } catch (err) {
            console.log(`No shipment found for order ${i}`);
          }

          ordersArray.push({
            id: i,
            manufacturer: order.manufacturer,
            partType: Number(order.partType),
            quantity: Number(order.quantity),
            pricePerUnit: order.pricePerUnit.toString(),
            status: Number(order.status)
          });
        }
      }

      setOrdersWithShipments(shipmentsArray);
      setOrders(ordersArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    try {
      const tx = await contract.acceptOrder(selectedOrder.id);
      await tx.wait();
      await fetchOrders(); // Refresh orders to reflect the updated status
      setModalOpen(false);
    } catch (err) {
      setError('Failed to accept order: ' + err.message);
    }
  };

  const handleRejectOrder = async () => {
    try {
      const tx = await contract.rejectOrder(selectedOrder.id);
      await tx.wait();
      await fetchOrders();
      setModalOpen(false);
    } catch (err) {
      setError('Failed to reject order: ' + err.message);
    }
  };

  const handleShipmentCreation = (order) => {
    setSelectedOrder(order);
    setShowShipmentModal(true);
  };

  const onShipmentCreated = async () => {
    console.log("Shipment created successfully!");
    setShowShipmentModal(false);
    await fetchOrders();
  };

  const checkSupplierRegistration = async () => {
    if (!contract || !account) return false;

    try {
      const supplier = await contract.suppliers(account);
      return supplier.isRegistered;
    } catch (err) {
      console.error('Error checking supplier registration:', err);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!contract || !account) {
        setLoading(false);
        setError('Contract or account not initialized');
        return;
      }

      try {
        const isRegistered = await checkSupplierRegistration();
        setIsRegisteredSupplier(isRegistered);

        if (!isRegistered) {
          setError('This account is not registered as a supplier. Please use a registered supplier account.');
          setLoading(false);
          return;
        }

        await fetchOrders();
      } catch (err) {
        console.error('Error initializing supplier dashboard:', err);
        setError('Failed to load supplier data');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [contract, account]);

  if (!isRegisteredSupplier && !loading) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          This account ({account}) is not registered as a supplier.
        </Alert>
        <Typography variant="body1" color="text.secondary">
          Please switch to a registered supplier account in MetaMask to access the supplier dashboard.
        </Typography>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        
        <Typography variant="h6" sx={{ p: 2 }}>
          Orders Assigned to You
        </Typography>

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Order ID</TableCell>
              <TableCell>Manufacturer</TableCell>
              <TableCell>Part Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Price/Unit (ETH)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.manufacturer}</TableCell>
                <TableCell>{order.partType}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{order.pricePerUnit}</TableCell>
                <TableCell>
                  {order.status === OrderStatus.Pending && 'Pending'}
                  {order.status === OrderStatus.Accepted && 'Accepted'}
                  {order.status === OrderStatus.ReadyForShipment && 'Ready for Shipment'}
                  {order.status === OrderStatus.Rejected && 'Rejected'}
                </TableCell>
                <TableCell>
                  {order.status === OrderStatus.Pending && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          setSelectedOrder(order);
                          setModalOpen(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                          setSelectedOrder(order);
                          setModalOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {(order.status === OrderStatus.Accepted || order.status === OrderStatus.ReadyForShipment) && 
                    !ordersWithShipments.includes(order.id) && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleShipmentCreation(order)}
                    >
                      Create Shipment
                    </Button>
                  )}
                  {ordersWithShipments.includes(order.id) && (
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Manage Order #{selectedOrder?.id}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body1">
            Do you want to accept or reject this order?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAcceptOrder} color="primary" variant="contained">
            Accept
          </Button>
          <Button onClick={handleRejectOrder} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {selectedOrder && (
        <CreateShipmentModal
          open={showShipmentModal}
          onClose={() => setShowShipmentModal(false)}
          order={selectedOrder}
          cargoContract={cargoContract}
          account={account}
          onShipmentCreated={onShipmentCreated}
          contract={contract}
        />
      )}
    </>
  );
};

export default SupplierOrderTable;