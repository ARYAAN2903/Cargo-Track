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
  CircularProgress,
  Alert
} from '@mui/material';

const CarrierTable = ({ cargoContract }) => {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCarriers = async () => {
      if (!cargoContract?.address) {
        console.error("CargoContract not properly initialized");
        setError('CargoTracking contract not initialized');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching carriers...");

        // Get all carrier registration events
        const filter = cargoContract.filters.CarrierRegistered();
        const events = await cargoContract.queryFilter(filter);
        console.log(`Found ${events.length} carrier events`);

        // Use a Map to keep track of unique carriers by address
        const carriersMap = new Map();

        for (const event of events) {
          const address = event.args.carrier;
          
          // Only process if we haven't seen this address before
          if (!carriersMap.has(address)) {
            try {
              const carrierData = await cargoContract.carriers(address);
              
              if (carrierData.isRegistered) {
                carriersMap.set(address, {
                  address: address,
                  name: carrierData.name,
                  registrationDate: new Date(Number(carrierData.registrationDate) * 1000).toLocaleDateString()
                });
              }
            } catch (err) {
              console.error(`Error fetching carrier ${address}:`, err);
            }
          }
        }

        // Convert Map to Array
        const carriersArray = Array.from(carriersMap.values());
        console.log("Unique carriers:", carriersArray);
        setCarriers(carriersArray);
        setError(null);

        // Listen for new registrations
        const handleNewCarrier = async (address, name, event) => {
          console.log("New carrier registered:", { address, name });
          if (!carriersMap.has(address)) {
            const carrierData = await cargoContract.carriers(address);
            if (carrierData.isRegistered) {
              const newCarrier = {
                address: address,
                name: carrierData.name,
                registrationDate: new Date(Number(carrierData.registrationDate) * 1000).toLocaleDateString()
              };
              setCarriers(prev => [...prev, newCarrier]);
              carriersMap.set(address, newCarrier);
            }
          }
        };

        cargoContract.on("CarrierRegistered", handleNewCarrier);

        return () => {
          cargoContract.off("CarrierRegistered", handleNewCarrier);
        };
      } catch (error) {
        console.error("Error fetching carriers:", error);
        setError(`Failed to fetch carriers: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCarriers();
  }, [cargoContract]);

  return (
    <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>Registered Carriers</Typography>
      
      {error && <Alert severity="error" sx={{ mx: 2 }}>{error}</Alert>}
      
      {loading ? (
        <CircularProgress sx={{ m: 2 }} />
      ) : (
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Address</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Registration Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carriers.length > 0 ? (
              carriers.map((carrier) => (
                <TableRow key={carrier.address}>
                  <TableCell>{carrier.address}</TableCell>
                  <TableCell>{carrier.name}</TableCell>
                  <TableCell>{carrier.registrationDate}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No carriers registered yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
};

export default CarrierTable;