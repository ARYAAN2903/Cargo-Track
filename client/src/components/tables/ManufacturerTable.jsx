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

const ManufacturerTable = ({ contract }) => {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchManufacturers = async () => {
      if (!contract) {
        setLoading(false);
        setError('Contract not initialized');
        return;
      }

      try {
        setLoading(true);
        const manufacturersArray = [];
        const eventFilter = contract.filters.ManufacturerRegistered();
        const events = await contract.queryFilter(eventFilter);
        console.log('Registration events:', events);

        for (const event of events) {
          const manufacturerAddress = event.args[0];
          try {
            const manufacturer = await contract.manufacturers(manufacturerAddress);
            console.log('Raw manufacturer data:', manufacturer);

            if (manufacturer && manufacturer.name && manufacturer.isRegistered) {
              // Format the registration date
              const date = new Date(manufacturer.registrationDate.toNumber() * 1000);
              const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              manufacturersArray.push({
                address: manufacturerAddress,
                name: manufacturer.name,
                registrationDate: formattedDate
              });
            }
          } catch (err) {
            console.error(`Error processing manufacturer at ${manufacturerAddress}:`, err);
          }
        }

        console.log('Final manufacturers array:', manufacturersArray);
        setManufacturers(manufacturersArray);
        setError(null);
      } catch (error) {
        console.error("Error fetching manufacturers:", error);
        setError(`Failed to fetch manufacturers: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturers();
  }, [contract]);

  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ p: 2 }}>Loading manufacturers...</Typography>
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
        Registered Manufacturers
      </Typography>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Address</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Registration Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {manufacturers.length > 0 ? (
            manufacturers.map((manufacturer, index) => (
              <TableRow key={index}>
                <TableCell>{manufacturer.address}</TableCell>
                <TableCell>{manufacturer.name}</TableCell>
                <TableCell>{manufacturer.registrationDate}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} align="center">
                No manufacturers registered yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ManufacturerTable;