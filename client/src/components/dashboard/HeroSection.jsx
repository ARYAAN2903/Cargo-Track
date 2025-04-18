import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import heroBackground from '../../assets/images/automotive.jpg';
import AccountDisplay from '../AccountDisplay';

const HeroSection = ({ account }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw', // Changed back to 100vw
        height: '100vh',
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        marginTop: '-80px',
        marginLeft: 'calc(-50vw + 50%)', // Add this to extend full width
        marginRight: 'calc(-50vw + 50%)', // Add this to extend full width
        overflow: 'hidden',
        boxSizing: 'border-box',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1
        }
      }}
    >
      {/* Account Display in top right */}
      <Box
        sx={{
          position: 'absolute',
          top: '24px', // Reduced from 80px
          right: '24px',
          zIndex: 2
        }}
      >
        <AccountDisplay account={account} />
      </Box>

      {/* Hero Content */}
      <Container
        maxWidth="lg"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          pt: '64px' // Add padding top to account for navbar
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={{
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            mb: 3,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          Blockchain-Powered Supply Chain
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: 'white',
            textAlign: 'center',
            maxWidth: '800px',
            mx: 'auto',
            lineHeight: 1.6,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          Secure, transparent, and efficient management of automotive parts 
          supply chain using blockchain technology. Track shipments, manage orders, 
          and process payments in real-time.
        </Typography>
      </Container>
    </Box>
  );
};

export default HeroSection;