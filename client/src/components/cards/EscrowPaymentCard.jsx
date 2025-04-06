import React, { useState } from 'react';
import {
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
} from '@mui/material';
import { ethers } from 'ethers';

const EscrowPaymentCard = ({ contract, account, setTransactionStatus }) => {
  const [escrowAmount, setEscrowAmount] = useState('');

  const handleEscrowPaymentClick = async () => {
    if (contract) {
      try {
        const transaction = await contract.depositFunds({
          value: ethers.utils.parseEther(escrowAmount),
        });
        await transaction.wait();
        console.log("EscrowPayment function called!");
      } catch (error) {
        console.error("Error calling EscrowPayment function:", error);
      }
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Escrow Payment</Typography>
        <TextField
          label="Escrow Amount (ETH)"
          variant="outlined"
          fullWidth
          value={escrowAmount}
          onChange={(e) => setEscrowAmount(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleEscrowPaymentClick}>
          Deposit Funds
        </Button>
      </CardContent>
    </Card>
  );
};

export default EscrowPaymentCard;