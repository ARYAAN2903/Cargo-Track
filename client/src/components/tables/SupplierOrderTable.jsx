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

const SupplierOrderTable = ({ contract, cargoContract, escrowContract, account }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegisteredSupplier, setIsRegisteredSupplier] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [ordersWithShipments, setOrdersWithShipments] = useState([]);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransactionDetails, setSelectedTransactionDetails] = useState(null);

  const getPartTypeName = (partType) => {
    switch(Number(partType)) {
      case 0: return 'Engine';
      case 1: return 'Transmission';
      case 2: return 'Brake Assembly';
      default: return 'Unknown';
    }
  };

  const fetchOrders = async () => {
    if (!contract || !account || !escrowContract) return;

    try {
      const orderCount = await contract.orderCount();
      const ordersArray = [];
      const shipmentsArray = [];

      for (let i = 1; i <= orderCount; i++) {
        const order = await contract.orders(i);
        if (order.supplier.toLowerCase() === account.toLowerCase()) {
          try {
            const shipment = await cargoContract.shipments(i);
            if (shipment && shipment.orderId.toString() !== '0') {
              shipmentsArray.push(i);
            }
            
            // Get payment details
            const orderPayment = await escrowContract.orderPayments(i);
            const shipmentPayment = await escrowContract.payments(i);
            const pricePerUnit = Number(order.pricePerUnit.toString());
            const quantity = Number(order.quantity);
            const totalAmount = pricePerUnit * quantity;
            const carrierFee = totalAmount * 0.05;

            // Get balance information if payment is released
            let balanceInfo = {
              initialBalance: null,
              finalBalance: null,
              difference: null
            };

            if (orderPayment.released || shipmentPayment.released) {
              const supplierBalance = await cargoContract.provider.getBalance(account);
              balanceInfo = {
                initialBalance: supplierBalance,
                finalBalance: supplierBalance.add(ethers.utils.parseEther(totalAmount.toString())),
                difference: ethers.utils.parseEther(totalAmount.toString())
              };
            }

            ordersArray.push({
              id: i,
              manufacturer: order.manufacturer,
              partType: Number(order.partType),
              quantity: quantity,
              pricePerUnit: pricePerUnit,
              status: Number(order.status),
              paymentStatus: {
                status: (orderPayment.released || shipmentPayment.released) ? 'Received' : 'Pending',
                supplierAmount: totalAmount,
                carrierFee: carrierFee,
                total: totalAmount + carrierFee
              },
              balanceInfo: balanceInfo,
              transactionHash: orderPayment.released || shipmentPayment.released ? 
                // Get transaction hash from payment events
                (await escrowContract.queryFilter(
                  escrowContract.filters.PaymentReleased(order.id)
                ))[0]?.transactionHash : null
            });
          } catch (err) {
            console.log(`Error processing order ${i}:`, err);
          }
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
              <TableCell>Total Value (ETH)</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Actions</TableCell>
              <TableCell>Transaction Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.manufacturer}</TableCell>
                <TableCell>{getPartTypeName(order.partType)}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>{order.pricePerUnit} ETH</TableCell>
                <TableCell>
                  {(Number(order.pricePerUnit) * order.quantity).toString()} ETH
                </TableCell>
                <TableCell>
                  <Typography
                    color={order.paymentStatus.status === 'Received' ? 'success.main' : 'warning.main'}
                  >
                    {order.paymentStatus.status === 'Received' ? (
                      <>
                        Payment Received ✓
                        <Typography variant="caption" color="text.secondary">
                          {order.paymentStatus.supplierAmount.toFixed(4)} ETH
                          {order.carrierFee > 0 && (
                            <>
                              <br />
                              Carrier Fee: {order.paymentStatus.carrierFee.toFixed(4)} ETH
                            </>
                          )}
                        </Typography>
                      </>
                    ) : (
                      'Payment Pending'
                    )}
                  </Typography>
                </TableCell>
                <TableCell>
                  {order.status === OrderStatus.Pending ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
                        Status: Pending
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => {
                            setSelectedOrder(order);
                            setModalOpen(true);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => {
                            setSelectedOrder(order);
                            setModalOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </Box>
                  ) : order.status === OrderStatus.Accepted ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
                        Status: Accepted ✓
                      </Typography>
                      {!ordersWithShipments.includes(order.id) && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleShipmentCreation(order)}
                        >
                          Create Shipment
                        </Button>
                      )}
                    </Box>
                  ) : order.status === OrderStatus.ReadyForShipment ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                        Status: Ready for Shipment
                      </Typography>
                      {!ordersWithShipments.includes(order.id) && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleShipmentCreation(order)}
                        >
                          Create Shipment
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" color="error.main">
                        Status: Rejected
                      </Typography>
                    </Box>
                  )}
                  {ordersWithShipments.includes(order.id) && (
                    <Typography 
                      variant="body2" 
                      color="success.main" 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 1,
                        mt: 1
                      }}
                    >
                      ✓ Shipment Created
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {order.paymentStatus.status === 'Received' ? (
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        setSelectedTransactionDetails(order);
                        setShowTransactionDetails(true);
                      }}
                    >
                      View Details
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Pending Transaction
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            )}
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

      <TransactionDetailsDialog 
        open={showTransactionDetails}
        onClose={() => setShowTransactionDetails(false)}
        details={selectedTransactionDetails}
      />
    </>
  );
};

const TransactionDetailsDialog = ({ open, onClose, details }) => {
  const [transactionInfo, setTransactionInfo] = useState(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (details?.transactionHash && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        try {
          // Get transaction details
          const tx = await provider.getTransaction(details.transactionHash);
          // Get transaction receipt for gas used
          const receipt = await provider.getTransactionReceipt(details.transactionHash);
          // Get block information
          const block = await provider.getBlock(receipt.blockNumber);

          setTransactionInfo({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: ethers.utils.formatEther(tx.value),
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
            blockNumber: receipt.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
          });
        } catch (error) {
          console.error('Error fetching transaction details:', error);
        }
      }
    };

    fetchTransactionDetails();
  }, [details]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Transaction Details</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Payment Information</Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">Balance Changes</Typography>
            <Typography>Initial Balance: {ethers.utils.formatEther(details?.balanceInfo?.initialBalance || '0')} ETH</Typography>
            <Typography>Amount Received: +{details?.paymentStatus?.supplierAmount?.toFixed(4)} ETH</Typography>
            <Typography>Final Balance: {ethers.utils.formatEther(details?.balanceInfo?.finalBalance || '0')} ETH</Typography>
          </Box>

          {transactionInfo && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Transaction Details</Typography>
              <Box sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                display: 'grid',
                gap: 1
              }}>
                <Typography variant="subtitle2">
                  Transaction Hash:
                  <Typography component="span" sx={{ ml: 1, wordBreak: 'break-all' }}>
                    {transactionInfo.hash}
                  </Typography>
                </Typography>

                <Typography variant="subtitle2">
                  From:
                  <Typography component="span" sx={{ ml: 1, wordBreak: 'break-all' }}>
                    {transactionInfo.from}
                  </Typography>
                </Typography>

                <Typography variant="subtitle2">
                  To:
                  <Typography component="span" sx={{ ml: 1, wordBreak: 'break-all' }}>
                    {transactionInfo.to}
                  </Typography>
                </Typography>

                <Typography variant="subtitle2">
                  Value: {transactionInfo.value} ETH
                </Typography>

                <Typography variant="subtitle2">
                  Gas Used: {transactionInfo.gasUsed}
                </Typography>

                <Typography variant="subtitle2">
                  Gas Price: {transactionInfo.gasPrice} Gwei
                </Typography>

                <Typography variant="subtitle2">
                  Block Number: {transactionInfo.blockNumber}
                </Typography>

                <Typography variant="subtitle2">
                  Timestamp: {transactionInfo.timestamp}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierOrderTable;