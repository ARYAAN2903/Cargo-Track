import React from 'react';
import { Grid, Container, Typography, Box } from '@mui/material';
import { Factory, LocalShipping, Timeline, Payment, ShoppingCart, Assignment } from '@mui/icons-material';
import DashboardCard from '../DashboardCard';

const Dashboard = () => {
  const firstRowItems = [
    {
      title: 'Register Manufacturer',
      description: 'Register and manage manufacturer details',
      route: '/manufacturer',
      icon: <Factory sx={{ color: '#fff' }} />
    },
    {
      title: 'Create Order',
      description: 'Create and manage supply orders',
      route: '/create-order',
      icon: <ShoppingCart sx={{ color: '#fff' }} />
    },
    {
      title: 'Supplier Dashboard',
      description: 'Manage orders, quality checks and shipments',
      route: '/supplier',
      icon: <Assignment sx={{ color: '#fff' }} />
    }
  ];

  const secondRowItems = [
    {
      title: 'Cargo Tracking',
      description: 'Track and manage shipments',
      route: '/cargo',
      icon: <LocalShipping sx={{ color: '#fff' }} />
    },
    {
      title: 'Escrow Payment',
      description: 'Manage escrow payments',
      route: '/escrow',
      icon: <Payment sx={{ color: '#fff' }} />
    }
  ];

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Container 
        maxWidth={false} 
        sx={{ 
          px: 2, // Reduced padding
          overflowX: 'hidden' 
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

        {/* First Row */}
        <Grid 
          container 
          spacing={2} // Reduced spacing
          sx={{ 
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            mx: 0 // Remove margin
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
                p: 1 // Add padding instead of margin
              }}
            >
              <DashboardCard {...item} />
            </Grid>
          ))}
        </Grid>

        {/* Second Row */}
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
      </Container>
    </Box>
  );
};

export default Dashboard;