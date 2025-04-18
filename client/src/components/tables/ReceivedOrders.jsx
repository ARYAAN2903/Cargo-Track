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
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { ethers } from 'ethers';

const getPartName = (partType) => {
  switch(partType) {
    case 0: return 'Engine';
    case 1: return 'Transmission';
    case 2: return 'Brake Assembly';
    default: return 'Unknown';
  }
};

const getShipmentStatus = (status) => {
  switch(status) {
    case 0: return 'Created';
    case 1: return 'In Transit';
    case 2: return 'Customs Processing';
    case 3: return 'Delivered';  // Changed from previous mapping
    default: return 'Unknown';
  }
};

const getTransactionHash = async (contract, eventName, orderId) => {
  try {
    const events = await contract.queryFilter(
      contract.filters[eventName](orderId)
    );
    return events[0]?.transactionHash || null;
  } catch (error) {
    console.error(`Error getting ${eventName} hash:`, error);
    return null;
  }
};

const ReceivedOrders = ({ 
  contract, 
  cargoContract, 
  escrowContract, 
  account, 
  setTransactionStatus 
}) => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!contract || !account || !cargoContract || !escrowContract) return;

    try {
      const orderCount = await contract.orderCount();
      const ordersArray = [];

      for (let i = 1; i <= orderCount; i++) {
        try {
          const orderDetails = await contract.getOrderDetails(i);
          
          if (orderDetails.manufacturer.toLowerCase() === account.toLowerCase()) {
            try {
              const shipment = await cargoContract.getShipment(i);
              
              if (shipment && shipment.id.toString() !== '0') {
                // Add detailed logging for delivered shipments
                const shipmentStatus = Number(shipment.status);
                console.log(`Shipment ${i} Details:`, {
                  status: shipmentStatus,
                  isDelivered: shipmentStatus === 3,
                  isCustomsCleared: shipment.isCustomsCleared,
                  currentLocation: shipment.currentLocation,
                  finalLocation: shipment.finalLocation
                });

                // Rest of your existing code...
                const payment = await escrowContract.payments(i);
                const orderPayment = await escrowContract.orderPayments(i);
                const supplier = await contract.suppliers(orderDetails.supplier);
                const carrier = await cargoContract.carriers(shipment.carrier);

                // If shipment is delivered, log additional details
                if (shipmentStatus === 3) {
                  console.log(`Delivered Shipment ${i} Payment Status:`, {
                    paymentReleased: payment.released || orderPayment.released,
                    hasPayment: payment.amount > 0 || orderPayment.amount > 0,
                    supplierAddress: orderDetails.supplier,
                    carrierAddress: shipment.carrier
                  });
                }

                // Continue with your existing code...
                ordersArray.push({
                  id: i,
                  partType: Number(orderDetails.partType),
                  quantity: Number(orderDetails.quantity),
                  pricePerUnit: parseFloat(orderDetails.pricePerUnit.toString()),
                  totalPrice: parseFloat((parseFloat(orderDetails.pricePerUnit.toString()) * Number(orderDetails.quantity)).toString()),
                  shipmentStatus: Number(shipment.status),
                  isCustomsCleared: shipment.isCustomsCleared,
                  supplier: {
                    name: supplier.name || 'Unknown',
                    address: orderDetails.supplier
                  },
                  carrier: {
                    name: carrier.name || 'Unknown',
                    address: shipment.carrier
                  },
                  locations: {
                    initial: shipment.initialLocation,
                    current: shipment.currentLocation || shipment.initialLocation,
                    final: shipment.finalLocation
                  },
                  paymentStatus: {
                    isReleased: payment.released || orderPayment.released,
                    hasPayment: payment.amount > 0 || orderPayment.amount > 0  // Add this line
                  },
                  transactions: {
                    createPayment: payment.amount > 0 ? {
                      hash: await getTransactionHash(escrowContract, 'PaymentCreated', i),
                      timestamp: new Date().toLocaleString()
                    } : null,
                    releasePayment: payment.released ? {
                      hash: await getTransactionHash(escrowContract, 'PaymentReleased', i),
                      timestamp: new Date().toLocaleString()
                    } : null
                  }
                });
              }
            } catch (shipmentError) {
              console.log(`No shipment found for order ${i}`);
              continue;
            }
          }
        } catch (orderError) {
          console.error(`Error processing order ${i}:`, orderError);
          continue;
        }
      }

      // Log summary of delivered orders
      const deliveredOrders = ordersArray.filter(order => order.shipmentStatus === 3);
      console.log('Summary of Delivered Orders:', {
        totalOrders: ordersArray.length,
        deliveredCount: deliveredOrders.length,
        deliveredOrderIds: deliveredOrders.map(order => order.id)
      });

      setOrders(ordersArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching received orders:', err);
      setError('Failed to fetch orders');
    }
  }, [contract, cargoContract, escrowContract, account]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReleasePayment = async (orderId) => {
    try {
      setIsProcessing(true);
      setError(null);

      const shipment = await cargoContract.getShipment(orderId);
      const orderDetails = await contract.getOrderDetails(orderId);

      // Get initial balances
      const supplierInitialBalance = await cargoContract.provider.getBalance(orderDetails[1]); // supplier address
      const carrierInitialBalance = await cargoContract.provider.getBalance(shipment.carrier);

      console.log('Initial Balances:', {
        supplier: {
          address: orderDetails[1],
          balance: ethers.utils.formatEther(supplierInitialBalance),
        },
        carrier: {
          address: shipment.carrier,
          balance: ethers.utils.formatEther(carrierInitialBalance),
        }
      });

      // Release payment
      const tx = await escrowContract.releasePayment(orderId, {
        gasLimit: ethers.utils.hexlify(300000),
        from: account
      });
      const receipt = await tx.wait();

      // Get final balances
      const supplierFinalBalance = await cargoContract.provider.getBalance(orderDetails[1]);
      const carrierFinalBalance = await cargoContract.provider.getBalance(shipment.carrier);

      console.log('Final Balances:', {
        supplier: {
          address: orderDetails[1],
          balance: ethers.utils.formatEther(supplierFinalBalance),
          difference: ethers.utils.formatEther(supplierFinalBalance.sub(supplierInitialBalance))
        },
        carrier: {
          address: shipment.carrier,
          balance: ethers.utils.formatEther(carrierFinalBalance),
          difference: ethers.utils.formatEther(carrierFinalBalance.sub(carrierInitialBalance))
        }
      });

      setTransactionStatus('Payment released successfully ✓');
      await fetchOrders();

      const updatedOrders = orders.map(order => 
        order.id === orderId ? {
          ...order,
          paymentStatus: {
            ...order.paymentStatus,
            isReleased: true
          },
          transactions: {
            ...order.transactions,
            releasePayment: {
              hash: receipt.transactionHash,
              timestamp: new Date().toLocaleString()
            }
          }
        } : order
      );
      setOrders(updatedOrders);

    } catch (error) {
      console.error('Payment release error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePayment = async (order) => {
    try {
        setIsProcessing(true);
        setError(null);

        // Get order details to check status
        const orderDetails = await contract.getOrderDetails(order.id);
        console.log('Order Details:', {
            orderId: order.id,
            status: Number(orderDetails[5]) // status is at index 5
        });

        // Check if payment already exists
        const hasPayment = await escrowContract.hasPayment(order.id);
        if (hasPayment) {
            throw new Error('Payment already exists for this order');
        }

        // Calculate payment amounts
        const totalAmount = ethers.utils.parseEther(order.totalPrice.toString());
        const carrierFee = totalAmount.mul(5).div(100); // 5% carrier fee
        const totalWithFee = totalAmount.add(carrierFee);

        console.log('Payment Details:', {
            orderId: order.id,
            totalAmount: ethers.utils.formatEther(totalAmount),
            carrierFee: ethers.utils.formatEther(carrierFee),
            totalWithFee: ethers.utils.formatEther(totalWithFee)
        });

        // Send transaction with manual gas limit
        const txOptions = {
            value: totalWithFee,
            gasLimit: ethers.utils.hexlify(300000), // Manual gas limit
            from: account
        };

        console.log('Transaction Options:', txOptions);

        const tx = await escrowContract.createOrderPayment(order.id, txOptions);
        console.log('Payment Creation Transaction:', tx.hash);

        setTransactionStatus('Creating payment...');

        const receipt = await tx.wait();
        console.log('Payment Creation Confirmed:', receipt);

        setTransactionStatus('Payment created successfully ✓');
        await fetchOrders();

        const updatedOrders = orders.map(o => 
          o.id === order.id ? {
            ...o,
            paymentStatus: {
              ...o.paymentStatus,
              hasPayment: true
            },
            transactions: {
              ...o.transactions,
              createPayment: {
                hash: receipt.transactionHash,
                timestamp: new Date().toLocaleString()
              }
            }
          } : o
        );
        setOrders(updatedOrders);

    } catch (error) {
        console.error('Payment Creation Error:', error);

        let errorMessage = 'Failed to create payment';
        if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds to create payment';
        } else if (error.message.includes('user rejected')) {
            errorMessage = 'Transaction was rejected';
        } else if (error.message.includes('Invalid order status')) {
            errorMessage = 'Order must be in Pending or Ready for Shipment status';
        } else if (error.message.includes('Payment already exists')) {
            errorMessage = 'Payment already exists for this order';
        }

        setError(errorMessage);
        setTransactionStatus('Payment creation failed');
    } finally {
        setIsProcessing(false);
    }
};

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Delivered Orders
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Order ID</TableCell>
              <TableCell>Parts Received</TableCell>
              <TableCell>Total Price (ETH)</TableCell>
              <TableCell>Shipment Status</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Transaction History</TableCell>
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
                  {Number(order.totalPrice).toFixed(4)} ETH
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getShipmentStatus(order.shipmentStatus)}
                    {order.isCustomsCleared && 
                      <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                        ✓ Customs Cleared
                      </Typography>
                    }
                  </Box>
                </TableCell>
                <TableCell>
                  {order.paymentStatus.isReleased ? (
                    <Typography color="success.main">
                      Payment Released ✓
                    </Typography>
                  ) : order.paymentStatus.hasPayment ? (
                    <Typography color="info.main">
                      Payment in Escrow ⌛
                    </Typography>
                  ) : (
                    <Typography color="warning.main">
                      Payment Required
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      // Use the order from the map function parameter
                      setSelectedTransaction({
                        createPayment: order.transactions?.createPayment,
                        releasePayment: order.transactions?.releasePayment,
                        paymentStatus: order.paymentStatus
                      });
                      setTransactionDialogOpen(true);
                    }}
                  >
                    View Transactions
                  </Button>
                </TableCell>
                <TableCell>
                  {isProcessing ? (
                    <CircularProgress size={24} />
                  ) : (
                    <>
                      {!order.paymentStatus.isReleased && (
                        <>
                          {!order.paymentStatus.hasPayment ? (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleCreatePayment(order)}
                              disabled={order.paymentStatus.hasPayment} // Disable if payment exists
                            >
                              Create Payment
                            </Button>
                          ) : order.shipmentStatus === 3 && order.isCustomsCleared && (
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => handleReleasePayment(order.id)}
                            >
                              Release Payment
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsModalOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                    </>
                  )}
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
        <Box sx={{ p: 2 }}>
          {selectedOrder && (
            <>
              <Typography variant="h6" gutterBottom>Order Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Typography>Order ID: {selectedOrder.id}</Typography>
                <Typography>Part Type: {getPartName(selectedOrder.partType)}</Typography>
                <Typography>Quantity: {selectedOrder.quantity}</Typography>
                <Typography>Price/Unit: {Number(selectedOrder.pricePerUnit).toFixed(4)} ETH</Typography>
                <Typography>Total Price: {Number(selectedOrder.totalPrice).toFixed(4)} ETH</Typography>
              </Box>

              <Typography variant="h6" gutterBottom>Shipping Details</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Typography>From: {selectedOrder.locations.initial}</Typography>
                <Typography>To: {selectedOrder.locations.final}</Typography>
                <Typography>Current Location: {selectedOrder.locations.current}</Typography>
                <Typography>Status: {getShipmentStatus(selectedOrder.shipmentStatus)}</Typography>
                <Typography>
                  Payment Status: {selectedOrder.paymentStatus.isReleased ? 
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Payment Released ✓</span> : 
                    <span style={{ color: '#ff9800' }}>Payment Pending</span>
                  }
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      <TransactionDetailsDialog 
        open={transactionDialogOpen}
        onClose={() => setTransactionDialogOpen(false)}
        transaction={selectedTransaction}
      />
    </>
  );
};

const TransactionDetailsDialog = ({ open, onClose, transaction }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>Transaction History</DialogTitle>
    <Box sx={{ p: 2 }}>
      {/* Payment Creation Transaction */}
      <Typography variant="h6" gutterBottom>Payment Creation</Typography>
      {transaction?.createPayment ? (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" gutterBottom>Transaction Hash</Typography>
          <Box sx={{ 
            bgcolor: 'grey.100', 
            p: 2, 
            borderRadius: 1,
            wordBreak: 'break-all',
            mb: 2
          }}>
            {transaction.createPayment.hash}
          </Box>
          <Typography variant="subtitle2" gutterBottom>Timestamp</Typography>
          <Box sx={{ mb: 2 }}>
            {transaction.createPayment.timestamp}
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${transaction.createPayment.hash}`)}
          >
            View on Etherscan ↗
          </Button>
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          {transaction?.paymentStatus?.hasPayment ? 
            'Transaction details loading...' : 
            'Payment not created yet'
          }
        </Typography>
      )}

      {/* Payment Release Transaction */}
      <Typography variant="h6" gutterBottom>Payment Release</Typography>
      {transaction?.releasePayment ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Transaction Hash</Typography>
          <Box sx={{ 
            bgcolor: 'grey.100', 
            p: 2, 
            borderRadius: 1,
            wordBreak: 'break-all',
            mb: 2
          }}>
            {transaction.releasePayment.hash}
          </Box>
          <Typography variant="subtitle2" gutterBottom>Timestamp</Typography>
          <Box sx={{ mb: 2 }}>
            {transaction.releasePayment.timestamp}
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${transaction.releasePayment.hash}`)}
          >
            View on Etherscan ↗
          </Button>
        </Box>
      ) : (
        <Typography color="text.secondary">
          {transaction?.paymentStatus?.isReleased ? 
            'Transaction details loading...' : 
            'Payment not released yet'
          }
        </Typography>
      )}
    </Box>
  </Dialog>
);

export default ReceivedOrders;