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
  Alert,
  CircularProgress,
} from '@mui/material';
import { ethers } from 'ethers';

const OrderTable = ({ contract, account }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPartTypes = (authorizedParts) => {
    if (!authorizedParts || !Array.isArray(authorizedParts)) return 'No parts authorized';

    const partNames = authorizedParts.map(part => {
      const partNum = Number(part);
      switch (partNum) {
        case 0: return 'Engine';
        case 1: return 'Transmission';
        case 2: return 'Brake Assembly';
        default: return 'Unknown Part';
      }
    });

    return partNames.join(', ');
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!contract || !account) {
        setLoading(false);
        setError('Contract or account not initialized');
        return;
      }

      try {
        const count = await contract.getOrderCount();
        console.log('Order count:', count);
        const ordersArray = [];

        for (let i = 0; i < count; i++) {
          try {
            const order = await contract.orders(i + 1);
            console.log('Order data:', order);

            if (order.manufacturer.toLowerCase() === account.toLowerCase()) {
              // Get manufacturer details
              const manufacturer = await contract.manufacturers(order.manufacturer);
              console.log('Manufacturer data:', manufacturer);

              // Get supplier details
              const supplier = await contract.suppliers(order.supplier);

              // Safely handle authorizedParts
              const authorizedParts = manufacturer && manufacturer.authorizedParts 
                ? manufacturer.authorizedParts.map(part => Number(part))
                : [];

              ordersArray.push({
                id: i + 1,
                address: order.manufacturer,
                supplier: supplier.name || order.supplier,
                partType: Number(order.partType),
                quantity: Number(order.quantity),
                pricePerUnit: ethers.utils.formatEther(order.pricePerUnit), // Convert Wei to ETH
                authorizedParts: authorizedParts
              });
            }
          } catch (err) {
            console.error(`Error fetching order at index ${i}:`, err);
            continue; // Skip this order and continue with the next one
          }
        }

        console.log('Final orders array:', ordersArray);
        setOrders(ordersArray);
        setError(null);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError(error.message || 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [contract, account]);

  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ p: 2 }}>Loading orders...</Typography>
        <CircularProgress sx={{ m: 2 }} />
      </TableContainer>
    );
  }

  if (error) {
    return (
      <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        My Orders
      </Typography>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Order ID</TableCell>
            <TableCell>Manufacturer (You)</TableCell>
            <TableCell>Supplier</TableCell>
            <TableCell>Authorized Parts</TableCell>
            <TableCell>Selected Part</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Price Per Unit</TableCell>
            <TableCell>Total Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order, index) => (
              <TableRow key={index}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.address}</TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>{getPartTypes(order.authorizedParts)}</TableCell>
                <TableCell>{getPartTypes([order.partType])}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{order.pricePerUnit}</TableCell>
                <TableCell>
                  {(Number(order.pricePerUnit) * Number(order.quantity)).toString()}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center">
                No orders created by you yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderTable;