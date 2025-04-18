import React from 'react';
import { Box, Typography, styled } from '@mui/material';

const StyledAccountBox = styled(Box)(({ theme }) => ({
  backgroundColor: '#FFD700', // Changed to golden yellow
  color: '#000', // Changed text color to black for better contrast
  borderRadius: '20px',
  padding: theme.spacing(0.5, 2),
  display: 'inline-block',
  fontWeight: 'bold', // Added to make text more visible on light background
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)' // Optional: adds subtle shadow
}));

const AccountDisplay = ({ account }) => {
  return (
    <StyledAccountBox>
      <Typography variant="body2">
        {account} {/* Display full account address */}
      </Typography>
    </StyledAccountBox>
  );
};

export default AccountDisplay;