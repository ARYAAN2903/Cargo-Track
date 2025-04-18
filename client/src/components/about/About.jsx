import React from 'react';
import { Box, Typography, Paper, Grid, Divider, Chip } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SecurityIcon from '@mui/icons-material/Security';
import BlockIcon from '@mui/icons-material/Block';
import PaymentsIcon from '@mui/icons-material/Payments';

const About = () => {
  return (
    <Box sx={{ p: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ mb: 4, color: '#000000' }}>
          Blockchain-Powered Cargo Shipping Platform
        </Typography>

        <Typography variant="h6" paragraph sx={{ color: '#000000' }}>
          A decentralized solution for transparent and secure supply chain management
        </Typography>

        <Divider sx={{ my: 4 }}>
          <Chip label="Key Features" sx={{ color: '#000000' }} />
        </Divider>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocalShippingIcon sx={{ mr: 2, color: '#000000' }} />
              <Typography variant="h6" sx={{ color: '#000000' }}>Supply Chain Tracking</Typography>
            </Box>
            <Typography paragraph>
              Real-time tracking of shipments with immutable blockchain records ensuring complete transparency in the supply chain.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SecurityIcon sx={{ mr: 2, color: '#000000' }} />
              <Typography variant="h6" sx={{ color: '#000000' }}>Secure Smart Contracts</Typography>
            </Box>
            <Typography paragraph>
              Ethereum-based smart contracts handling manufacturer-supplier relationships, order management, and automated payments.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BlockIcon sx={{ mr: 2, color: '#000000' }} />
              <Typography variant="h6" sx={{ color: '#000000' }}>Decentralized Architecture</Typography>
            </Box>
            <Typography paragraph>
              Built on Ethereum blockchain ensuring data integrity, transparency, and immutability of all transactions and records.
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PaymentsIcon sx={{ mr: 2, color: '#000000' }} />
              <Typography variant="h6" sx={{ color: '#000000' }}>Escrow Payment System</Typography>
            </Box>
            <Typography paragraph>
              Secure payment handling through smart contract escrow, protecting both manufacturers and suppliers.
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }}>
          <Chip label="Tech Stack" sx={{ color: '#000000' }} />
        </Divider>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          {['React', 'Ethereum', 'Solidity', 'Material-UI', 'Web3.js', 'Hardhat'].map((tech) => (
            <Grid item key={tech}>
              <Chip label={tech} variant="outlined" sx={{ color: '#000000', borderColor: '#000000' }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default About;