import React from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import '../../styles/Dashboard.css';

const DashboardLayout = ({ children, account }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar account={account} />
      <Box
        component="main"
        className="dashboard-container"
      >
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;