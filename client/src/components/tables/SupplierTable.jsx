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
import { ethers } from 'ethers';

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
            prices: prices // Prices are already in ETH, no conversion needed
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
    <TableContainer component={Paper} sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>Registered Suppliers</Typography>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell>Address</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Engine Price (ETH)</TableCell>
            <TableCell>Transmission Price (ETH)</TableCell>
            <TableCell>Brake Assembly Price (ETH)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {suppliers.map((supplier, index) => (
            <TableRow key={index}>
              <TableCell>{supplier.address}</TableCell>
              <TableCell>{supplier.name}</TableCell>
              <TableCell>{Number(supplier.prices[0]).toFixed(2)} ETH</TableCell>
              <TableCell>{Number(supplier.prices[1]).toFixed(2)} ETH</TableCell>
              <TableCell>{Number(supplier.prices[2]).toFixed(2)} ETH</TableCell>
            </TableRow>
          ))}
          {suppliers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No suppliers registered
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SupplierTable;

