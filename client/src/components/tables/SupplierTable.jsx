import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';

const SupplierTable = ({ contract }) => {
  const [suppliers, setSuppliers] = useState([]);

  const fetchSuppliers = async () => {
    if (!contract) return;

    try {
      const supplierCount = await contract.getSupplierCount();
      const suppliersList = [];

      for (let i = 0; i < supplierCount; i++) {
        const address = await contract.supplierAddresses(i);
        const supplier = await contract.suppliers(address);

        if (supplier.isRegistered) {
          const prices = await contract.getSupplierPrices(address);
          suppliersList.push({
            address,
            name: supplier.name,
            prices: prices // This will be an array of 3 prices
          });
        }
      }
      setSuppliers(suppliersList);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [contract]);

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>Registered Suppliers</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Engine Price</TableCell>
            <TableCell>Transmission Price</TableCell>
            <TableCell>Brake Assembly Price</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {suppliers.map((supplier, index) => (
            <TableRow key={index}>
              <TableCell>{supplier.address}</TableCell>
              <TableCell>{supplier.name}</TableCell>
              <TableCell>{supplier.prices ? supplier.prices[0].toString() : '-'}</TableCell>
              <TableCell>{supplier.prices ? supplier.prices[1].toString() : '-'}</TableCell>
              <TableCell>{supplier.prices ? supplier.prices[2].toString() : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SupplierTable;

