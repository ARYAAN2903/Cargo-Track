import React, { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Alert,
} from '@mui/material';
import ManufacturerTable from '../tables/ManufacturerTable';
import SupplierTable from '../tables/SupplierTable';
import CarrierTable from '../tables/CarrierTable';
import { ethers } from 'ethers';

const ManufacturerSupplyCard = ({ contract, cargoContract, account, setTransactionStatus, onManufacturerRegistered }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat's first account

  useEffect(() => {
    setIsAdmin(account?.toLowerCase() === adminAddress.toLowerCase());
  }, [account]);

  const [manufacturerAddress, setManufacturerAddress] = useState('');
  const [name, setName] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierRegistrationStatus, setSupplierRegistrationStatus] = useState('');

  const [carrierAddress, setCarrierAddress] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [carrierRegistrationStatus, setCarrierRegistrationStatus] = useState('');

  const [enginePrice, setEnginePrice] = useState('');
  const [transmissionPrice, setTransmissionPrice] = useState('');
  const [brakeAssemblyPrice, setBrakeAssemblyPrice] = useState('');

  const handleRegisterManufacturer = async () => {
    if (!manufacturerAddress || !name || selectedParts.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Validate address format
      if (!ethers.utils.isAddress(manufacturerAddress)) {
        throw new Error('Invalid manufacturer address format');
      }

      console.log('Registering manufacturer with params:', {
        address: manufacturerAddress,
        name: name,
        parts: selectedParts
      });

      // Convert parts array to uint8 array
      const partsArray = selectedParts.map(part => Number(part));

      // Estimate gas first
      const gasEstimate = await contract.estimateGas.registerManufacturer(
        manufacturerAddress,
        name,
        partsArray
      );

      console.log('Estimated gas:', gasEstimate.toString());

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await contract.registerManufacturer(
        manufacturerAddress,
        name,
        partsArray,
        {
          gasLimit: gasLimit
        }
      );

      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Clear form on success
      setManufacturerAddress('');
      setName('');
      setSelectedParts([]);
      
      // Trigger refresh of manufacturer list
      if (onManufacturerRegistered) {
        onManufacturerRegistered();
      }

    } catch (err) {
      console.error('Registration error:', err);
      
      // Enhanced error handling
      let errorMessage = 'Failed to register manufacturer: ';
      
      if (err.error?.data?.message) {
        errorMessage += err.error.data.message;
      } else if (err.reason) {
        errorMessage += err.reason;
      } else if (err.message) {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSupplier = async () => {
    if (!contract) return;

    if (!supplierAddress || !supplierName || !enginePrice || !transmissionPrice || !brakeAssemblyPrice) {
      setSupplierRegistrationStatus('error');
      return;
    }

    try {
      setTransactionStatus('pending');
      setSupplierRegistrationStatus('pending');

      const transaction = await contract.registerSupplier(
        supplierAddress,
        supplierName,
        [enginePrice, transmissionPrice, brakeAssemblyPrice]
      );
      await transaction.wait();

      setTransactionStatus('confirmed');
      setSupplierRegistrationStatus('success');
      console.log("Supplier registered successfully!");

      // Reset form
      setSupplierAddress('');
      setSupplierName('');
      setEnginePrice('');
      setTransmissionPrice('');
      setBrakeAssemblyPrice('');
    } catch (error) {
      setTransactionStatus('failed');
      setSupplierRegistrationStatus('error');
      console.error("Error registering supplier:", error);
    }
  };

  const handleRegisterCarrier = async () => {
    if (!contract || !cargoContract) {
      console.error("Contracts not initialized");
      return;
    }

    if (!carrierAddress || !carrierName) {
      setCarrierRegistrationStatus('error');
      return;
    }

    try {
      setTransactionStatus('pending');
      setCarrierRegistrationStatus('pending');

      // Register carrier in CargoTracking contract instead
      const transaction = await cargoContract.registerCarrier(
        carrierAddress,
        carrierName
      );

      console.log("Registering carrier with transaction:", transaction.hash);
      const receipt = await transaction.wait();
      console.log("Transaction receipt:", receipt);

      // Check for the CarrierRegistered event
      const event = receipt.events?.find(e => e.event === 'CarrierRegistered');
      if (event) {
        console.log("CarrierRegistered event found:", event);
      }

      setTransactionStatus('confirmed');
      setCarrierRegistrationStatus('success');
      console.log("Carrier registered successfully!");

      // Reset form
      setCarrierAddress('');
      setCarrierName('');
    } catch (error) {
      console.error("Error registering carrier:", error);
      setTransactionStatus('failed');
      setCarrierRegistrationStatus('error');
    }
  };

  return (
    <Box sx={{ maxWidth: '800px', margin: '0 auto' }}>
      {!isAdmin ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Only admin (Account #0) can register new actors. Please switch to admin account.
          <br />
          Current account: {account}
          <br />
          Required account: {adminAddress}
        </Alert>
      ) : (
        <>
          {/* Manufacturer Registration Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: '#1a237e' }}>
                Register Manufacturer
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  label="Manufacturer Address"
                  variant="outlined"
                  fullWidth
                  value={manufacturerAddress}
                  onChange={(e) => setManufacturerAddress(e.target.value)}
                  required
                />
                <TextField
                  label="Manufacturer Name"
                  variant="outlined"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Box>

              <Typography variant="subtitle1" gutterBottom>
                Authorized Parts
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedParts.includes(0)}
                      onChange={(e) => {
                        const updatedParts = e.target.checked
                          ? [...selectedParts, 0]
                          : selectedParts.filter(part => part !== 0);
                        setSelectedParts(updatedParts);
                      }}
                      name="engine"
                    />
                  }
                  label="Engine"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedParts.includes(1)}
                      onChange={(e) => {
                        const updatedParts = e.target.checked
                          ? [...selectedParts, 1]
                          : selectedParts.filter(part => part !== 1);
                        setSelectedParts(updatedParts);
                      }}
                      name="transmission"
                    />
                  }
                  label="Transmission"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedParts.includes(2)}
                      onChange={(e) => {
                        const updatedParts = e.target.checked
                          ? [...selectedParts, 2]
                          : selectedParts.filter(part => part !== 2);
                        setSelectedParts(updatedParts);
                      }}
                      name="brakeAssembly"
                    />
                  }
                  label="Brake Assembly"
                />
              </Box>

              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRegisterManufacturer}
                fullWidth
                size="large"
                sx={{
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  py: 1.5
                }}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Manufacturer'}
              </Button>
            </CardContent>
          </Card>

          {/* Supplier Registration Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: '#1a237e' }}>
                Register Supplier
              </Typography>

              {supplierRegistrationStatus === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Please fill all required fields.
                </Alert>
              )}

              {supplierRegistrationStatus === 'success' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Supplier registered successfully!
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  label="Supplier Address"
                  variant="outlined"
                  fullWidth
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  required
                />
                <TextField
                  label="Supplier Name"
                  variant="outlined"
                  fullWidth
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
                <TextField
                  label="Engine Price (ETH)"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={enginePrice}
                  onChange={(e) => setEnginePrice(e.target.value)}
                  required
                />
                <TextField
                  label="Transmission Price (ETH)"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={transmissionPrice}
                  onChange={(e) => setTransmissionPrice(e.target.value)}
                  required
                />
                <TextField
                  label="Brake Assembly Price (ETH)"
                  variant="outlined"
                  fullWidth
                  type="number"
                  value={brakeAssemblyPrice}
                  onChange={(e) => setBrakeAssemblyPrice(e.target.value)}
                  required
                />
              </Box>

              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRegisterSupplier}
                fullWidth
                size="large"
                sx={{
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  py: 1.5
                }}
              >
                Register Supplier
              </Button>
            </CardContent>
          </Card>

          {/* Carrier Registration Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ color: '#1a237e' }}>
                Register Carrier
              </Typography>

              {carrierRegistrationStatus === 'error' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Please fill all required fields.
                </Alert>
              )}

              {carrierRegistrationStatus === 'success' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Carrier registered successfully!
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField
                  label="Carrier Address"
                  variant="outlined"
                  fullWidth
                  value={carrierAddress}
                  onChange={(e) => setCarrierAddress(e.target.value)}
                  required
                />
                <TextField
                  label="Carrier Name"
                  variant="outlined"
                  fullWidth
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                />
              </Box>

              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRegisterCarrier}
                fullWidth
                size="large"
                sx={{
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  py: 1.5
                }}
              >
                Register Carrier
              </Button>
            </CardContent>
          </Card>

          {/* Tables */}
          <ManufacturerTable contract={contract} />
          <SupplierTable contract={contract} />
          <CarrierTable cargoContract={cargoContract} />
        </>
      )}
    </Box>
  );
};

export default ManufacturerSupplyCard;