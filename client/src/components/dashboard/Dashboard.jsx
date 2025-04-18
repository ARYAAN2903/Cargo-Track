import React from 'react';
import { Grid, Container, Typography, Box } from '@mui/material';
import { Factory, LocalShipping, Timeline, Payment, ShoppingCart, Assignment } from '@mui/icons-material';
import DashboardCard from '../DashboardCard';
import HeroSection from './HeroSection';
import About from '../about/About';

const Dashboard = ({ account }) => {
  const firstRowItems = [
    {
      title: 'Register Stakeholders',
      description: 'Register and manage stakeholders',
      route: '/manufacturer',
      icon: <Factory sx={{ color: '#fff' }} />
    },
    {
      title: 'Create Order',
      description: 'Create and manage supply orders',
      route: '/create-order',
      icon: <ShoppingCart sx={{ color: '#fff' }} />
    }
  ];

  const secondRowItems = [
    {
      title: 'Supplier Dashboard',
      description: 'Manage orders, quality checks and shipments',
      route: '/supplier',
      icon: <Assignment sx={{ color: '#fff' }} />
    },
    {
      title: 'Cargo Tracking',
      description: 'Track and manage shipments',
      route: '/cargo',
      icon: <LocalShipping sx={{ color: '#fff' }} />
    }
  ];

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      position: 'relative'
    }}>
      <HeroSection account={account} />
      
      <Container 
        maxWidth={false} 
        sx={{ 
          px: 2,
          position: 'relative',
          zIndex: 3,
          pb: 8,
          mt: 4
        }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: 4,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#1a237e'
          }}
        >
          Supply Chain Dashboard
        </Typography>

        <Grid 
          container 
          spacing={2}
          sx={{ 
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            mx: 0
          }}
        >
          {firstRowItems.map((item, index) => (
            <Grid 
              item 
              xs={12} 
              md={4}
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 1
              }}
            >
              <DashboardCard {...item} />
            </Grid>
          ))}
        </Grid>

        <Grid 
          container 
          spacing={2}
          sx={{ 
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            mx: 0
          }}
        >
          {secondRowItems.map((item, index) => (
            <Grid 
              item 
              xs={12} 
              md={4}
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 1
              }}
            >
              <DashboardCard {...item} />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6 }}>
          <About />
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;