import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

// Import contract ABIs
import ManufacturerSupply from '../../artifacts/contracts/ManufacturerSupply.sol/ManufacturerSupply.json';
import CargoTracking from '../../artifacts/contracts/CargoTracking.sol/CargoTracking.json';
import EscrowPayment from '../../artifacts/contracts/EscrowPayment.sol/EscrowPayment.json';

import contractAddresses from './contract-addresses.json';

// Import components
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/dashboard/Dashboard';
import ManufacturerSupplyCard from './components/cards/ManufacturerSupplyCard';
import CargoTrackingCard from './components/cards/CargoTrackingCard';
import EscrowPaymentCard from './components/cards/EscrowPaymentCard';
import CreateOrderCard from './components/cards/CreateOrderCard';
import SupplierTable from './components/tables/SupplierTable';
import SupplierOrderTable from './components/tables/SupplierOrderTable';

// Import styles
import './styles/Dashboard.css';
import './styles/Cards.css';

// Contract Addresses
const MANUFACTURER_SUPPLY_ADDRESS = contractAddresses.ManufacturerSupply;
const CARGO_TRACKING_ADDRESS = contractAddresses.CargoTracking;
const ESCROW_PAYMENT_ADDRESS = contractAddresses.EscrowPayment;

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [cargoContract, setCargoContract] = useState(null);
  const [escrowPaymentContract, setEscrowPaymentContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');

  const init = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

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

      console.log('Contracts initialized:', {
        manufacturerSupply: manufacturerSupplyContract.address,
        cargoTracking: cargoTrackingContract.address
      });

      setAccount(account);
      setContract(manufacturerSupplyContract);
      setCargoContract(cargoTrackingContract);
      setLoading(false);

    } catch (error) {
      console.error('Error initializing:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <Router>
      <DashboardLayout account={account}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route 
            path="/manufacturer" 
            element={
              <ManufacturerSupplyCard 
                contract={contract}
                cargoContract={cargoContract}
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
                  account={account}
                  setTransactionStatus={setTransactionStatus}
                />
              </Box>
            } 
          />
          <Route 
            path="/escrow" 
            element={
              <EscrowPaymentCard 
                contract={escrowPaymentContract}
                account={account}
                setTransactionStatus={setTransactionStatus}
              />
            } 
          />
          <Route 
            path="/create-order" 
            element={
              <CreateOrderCard 
                contract={contract}
                cargoContract={cargoContract}
                account={account}
                setTransactionStatus={setTransactionStatus}
              />
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
                  account={account}
                />
              </Box>
            } 
          />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

export default App;
