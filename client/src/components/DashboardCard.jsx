import React from 'react';
import { Card, CardContent, Typography, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const DashboardCard = ({ title, description, route, icon }) => {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        width: '400px', // Fixed width for all cards
        height: '200px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
          cursor: 'pointer'
        },
        backgroundColor: '#000000',
        borderRadius: 2,
        boxShadow: 3,
        color: 'white',
        margin: '0 auto', // Center the card
      }}
      onClick={() => navigate(route)}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          height: '100%' // Take full height
        }}
      >
        <IconButton
          sx={{
            backgroundColor: '#1a237e',
            mb: 2,
            '&:hover': {
              backgroundColor: '#283593'
            }
          }}
        >
          {icon}
        </IconButton>
        <Typography
          variant="h6"
          component="div"
          sx={{
            mb: 1,
            fontWeight: 'bold',
            textAlign: 'center',
            color: 'white'
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            color: '#cccccc'
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default DashboardCard;