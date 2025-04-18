import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Link } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import AccountDisplay from '../AccountDisplay';

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0 24px',
  backgroundColor: 'transparent',
  color: '#fff'
}));

const NavLink = styled(Link)({
  color: '#ffffff',
  textDecoration: 'none',
  marginLeft: '24px',
  fontWeight: 500,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '0',
    height: '2px',
    bottom: '-4px',
    left: '0',
    backgroundColor: '#ffffff',
    transition: 'width 0.3s ease-in-out'
  },
  '&:hover': {
    color: '#ffffff',
    '&::after': {
      width: '100%'
    }
  }
});

const Navbar = ({ account, onConnect }) => {
  const navLinks = [
    { title: 'Home', path: '/' },
    { title: 'About', path: '/about' },
  ];

  return (
    <AppBar 
      position="absolute"
      elevation={0} 
      sx={{ 
        backgroundColor: 'transparent',
        zIndex: 3
      }}
    >
      <StyledToolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            component={RouterLink}
            to="/"
            sx={{ 
              fontWeight: 600,
              color: '#ffffff', // Changed to white
              textDecoration: 'none',
              marginRight: 4
            }}
          >
            CargoTrack
          </Typography>
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                component={RouterLink}
                to={link.path}
                sx={{ 
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#ffffff' // Ensuring white color
                }}
              >
                {link.title}
              </NavLink>
            ))}
          </Box>
        </Box>
        <Box>
          {account ? (
            <AccountDisplay account={account} />
          ) : (
            <Button 
              variant="contained"
              sx={{
                backgroundColor: '#000000',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#333333'
                },
                fontWeight: 'bold',
                borderRadius: '20px',
                px: 3
              }}
              onClick={onConnect}
            >
              Connect Wallet
            </Button>
          )}
        </Box>
      </StyledToolbar>
    </AppBar>
  );
};

export default Navbar;