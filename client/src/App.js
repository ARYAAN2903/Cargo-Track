import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';

// Import contract ABIs
import ManufacturerSupply from '../../artifacts/contracts/ManufacturerSupply.sol/ManufacturerSupply.json';
import CargoTracking from '../../artifacts/contracts/CargoTracking.sol/CargoTracking.json';
import EscrowPayment from '../../artifacts/contracts/EscrowPayment.sol/EscrowPayment.json';

// Import contract addresses
import contractAddresses from './contract-addresses.json';

// Import components
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import ManufacturerSupplyCard from './components/cards/ManufacturerSupplyCard';
import CargoTrackingCard from './components/cards/CargoTrackingCard';
import CreateOrderCard from './components/cards/CreateOrderCard';
import SupplierTable from './components/tables/SupplierTable';
import SupplierOrderTable from './components/tables/SupplierOrderTable';
import OrderTable from './components/tables/OrderTable';
import ReceivedOrders from './components/tables/ReceivedOrders';
import About from './components/about/About';

// Import styles
import './styles/Dashboard.css';
import './styles/Cards.css';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [cargoContract, setCargoContract] = useState(null);
  const [escrowContract, setEscrowContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');

  const init = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      // Check if we have contract addresses
      if (!contractAddresses.ManufacturerSupply || 
          !contractAddresses.CargoTracking || 
          !contractAddresses.EscrowPayment) {
        throw new Error('Contract addresses are not configured');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Initialize contracts with error handling
      const manufacturerSupplyContract = new ethers.Contract(
        contractAddresses.ManufacturerSupply,
        ManufacturerSupply.abi,
        signer
      );

      const cargoTrackingContract = new ethers.Contract(
        contractAddresses.CargoTracking,
        CargoTracking.abi,
        signer
      );

      const escrowPaymentContract = new ethers.Contract(
        contractAddresses.EscrowPayment,
        EscrowPayment.abi,
        signer
      );

      console.log('Contracts initialized:', {
        manufacturerSupply: manufacturerSupplyContract.address,
        cargoTracking: cargoTrackingContract.address,
        escrowPayment: escrowPaymentContract.address
      });

      setAccount(account);
      setContract(manufacturerSupplyContract);
      setCargoContract(cargoTrackingContract);
      setEscrowContract(escrowPaymentContract);
      setLoading(false);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Error initializing:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
    return () => {
      // Cleanup listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Router>
      <Box sx={{ 
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}>
        <DashboardLayout account={account}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            <Route 
              path="/manufacturer" 
              element={
                <ManufacturerSupplyCard 
                  contract={contract}
                  cargoContract={cargoContract}
                  escrowContract={escrowContract}
                  account={account}
                  setTransactionStatus={setTransactionStatus}
                />
              } 
            />
            
            <Route 
              path="/cargo" 
              element={
                <Box sx={{ p: 3 }}>
                  <CargoTrackingCard 
                    contract={contract}
                    cargoContract={cargoContract}
                    escrowContract={escrowContract}
                    account={account}
                    setTransactionStatus={setTransactionStatus}
                  />
                </Box>
              } 
            />
            
            <Route 
              path="/create-order" 
              element={
                <Box sx={{ p: 3 }}>
                  <CreateOrderCard 
                    contract={contract}
                    cargoContract={cargoContract}
                    escrowContract={escrowContract}
                    account={account}
                    setTransactionStatus={setTransactionStatus}
                  />
                  <OrderTable 
                    contract={contract}
                    account={account}
                  />
                  <ReceivedOrders 
                    contract={contract}
                    cargoContract={cargoContract}
                    escrowContract={escrowContract}
                    account={account}
                    setTransactionStatus={setTransactionStatus}
                  />
                </Box>
              } 
            />
            
            <Route 
              path="/supplier" 
              element={
                <Box sx={{ p: 3 }}>
                  <Typography variant="h4" sx={{ mb: 4 }}>Supplier Dashboard</Typography>
                  <SupplierOrderTable 
                    contract={contract}
                    cargoContract={cargoContract}
                    escrowContract={escrowContract}
                    account={account}
                  />
                </Box>
              } 
            />
            
            <Route 
              path="/orders" 
              element={
                <Box sx={{ p: 3 }}>
                  <Typography variant="h4" sx={{ mb: 4 }}>Order Management</Typography>
                  <SupplierTable 
                    contract={contract}
                    escrowContract={escrowContract}
                  />
                </Box>
              } 
            />
            
            <Route path="/about" element={<About />} />
          </Routes>
        </DashboardLayout>
      </Box>
    </Router>
  );
}

export default App;
