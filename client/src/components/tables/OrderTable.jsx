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
} from '@mui/material';

const OrderTable = ({ contract, account }) => {
  const [orders, setOrders] = useState([]);
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
        setError('Contract or account not initialized');
        return;
      }

      try {
        const count = await contract.getOrderCount();
        const ordersArray = [];

        for (let i = 0; i < count; i++) {
          try {
            const order = await contract.orders(i + 1);

            if (order.manufacturer.toLowerCase() === account.toLowerCase()) {
              const supplier = await contract.suppliers(order.supplier);
              
              ordersArray.push({
                id: i + 1,
                address: order.manufacturer,
                supplier: supplier.name || order.supplier,
                partType: Number(order.partType),
                quantity: Number(order.quantity),
                pricePerUnit: order.pricePerUnit.toString(),
                totalAmount: (Number(order.pricePerUnit) * Number(order.quantity)).toString()
              });
            }
          } catch (err) {
            console.error(`Error fetching order at index ${i}:`, err);
            continue;
          }
        }

        setOrders(ordersArray);
        setError(null);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError(error.message || 'Failed to fetch orders');
      }
    };

    fetchOrders();
  }, [contract, account]);

  return (
    <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        My Orders
      </Typography>
      {error && <Alert severity="error" sx={{ mx: 2, mb: 2 }}>{error}</Alert>}
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Order ID</TableCell>
            <TableCell>Supplier</TableCell>
            <TableCell>Part Type</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Price/Unit (ETH)</TableCell>
            <TableCell>Total Amount (ETH)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>{getPartTypes([order.partType])}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{order.pricePerUnit} ETH</TableCell>
                <TableCell>{order.totalAmount} ETH</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderTable;