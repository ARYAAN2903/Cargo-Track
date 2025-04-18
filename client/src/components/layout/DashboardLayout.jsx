import React from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';
import InfoIcon from '@mui/icons-material/Info';
import '../../styles/Dashboard.css';

const DashboardLayout = ({ children, account, onConnect }) => {
  const navigationItems = [
    {
      text: 'About',
      path: '/about',
      icon: <InfoIcon />
    }
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh' 
    }}>
      <Navbar account={account} onConnect={onConnect} navigationItems={navigationItems} />
      <Box
        component="main"
        className="dashboard-container"
        sx={{ flex: 1 }}
      >
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
      <Footer />
    </Box>
  );
};

export default DashboardLayout;