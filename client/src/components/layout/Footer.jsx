import React from 'react';
import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#000000',
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Blockchain Cargo Shipping
            </Typography>
            <Typography variant="body2" color="inherit">
              A decentralized solution for supply chain management built on Ethereum
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/" color="inherit" underline="hover">
                Home
              </Link>
              <Link href="/about" color="inherit" underline="hover">
                About
              </Link>
              <Link href="/manufacturer" color="inherit" underline="hover">
                Manufacturer Dashboard
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Connect With Us
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="https://github.com" color="inherit" target="_blank">
                <GitHubIcon />
              </Link>
              <Link href="https://linkedin.com" color="inherit" target="_blank">
                <LinkedInIcon />
              </Link>
              <Link href="mailto:contact@example.com" color="inherit">
                <EmailIcon />
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="inherit">
            © {new Date().getFullYear()} Blockchain Cargo Shipping. All rights reserved.
          </Typography>
          <Box>
            <Link href="/privacy" color="inherit" sx={{ mr: 2 }} underline="hover">
              Privacy Policy
            </Link>
            <Link href="/terms" color="inherit" underline="hover">
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;