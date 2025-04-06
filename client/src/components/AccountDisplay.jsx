import React from 'react';
import { Box, Typography, styled } from '@mui/material';

const StyledAccountBox = styled(Box)(({ theme }) => ({
  backgroundColor: '#000',
  color: '#fff',
  borderRadius: '20px',
  padding: theme.spacing(0.5, 2),
  display: 'inline-block'
}));

const AccountDisplay = ({ account }) => {
  const shortenedAccount = account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : '';

  return (
    <StyledAccountBox>
      <Typography variant="body2">
        {shortenedAccount}
      </Typography>
    </StyledAccountBox>
  );
};

export default AccountDisplay;