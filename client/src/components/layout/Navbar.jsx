import React from 'react';
import { AppBar, Toolbar, Typography, Box, styled } from '@mui/material';
import AccountDisplay from '../AccountDisplay'; // Fixed import path

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0 24px',
  backgroundColor: 'transparent',
  color: '#000'
}));

const Navbar = ({ account }) => {
  return (
    <AppBar position="fixed" elevation={0} sx={{ backgroundColor: 'transparent' }}>
      <StyledToolbar>
        <Typography 
          variant="h6" 
          component="div"
          sx={{ 
            fontWeight: 600,
            color: '#000'
          }}
        >
          CargoTrack
        </Typography>
        <Box>
          <AccountDisplay account={account} />
        </Box>
      </StyledToolbar>
    </AppBar>
  );
};

export default Navbar;