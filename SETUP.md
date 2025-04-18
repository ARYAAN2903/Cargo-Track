# Cargo Shipping Blockchain Application Setup Guide

## Prerequisites

- Node.js (v16.0.0 or higher)
- npm (Node Package Manager)
- Git
- MetaMask browser extension

## Installation Steps

1. **Clone the Repository**
```bash
git clone https://github.com/ARYAAN2903/Cargo-Track
cd cargo-shipping-blockchain
```

2. **Install Root Dependencies**
```bash
npm install
```

3. **Install Client Dependencies**
```bash
cd client
npm install
cd ..
```

4. **Start Local Blockchain Network**
Open a new terminal and run:
```bash
npx hardhat node
```

5. **Deploy Smart Contracts**
In a separate terminal, run:
```bash
npm run deploy
```

6. **Start the Frontend Application**
```bash
npm start
```

## MetaMask Configuration

1. Open MetaMask and connect to the local network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. Import a test account using the private key provided by Hardhat node

## Troubleshooting

### Common Issues:

1. **Contract deployment fails**
   - Ensure Hardhat node is running
   - Check if you have sufficient test ETH in your account

2. **Frontend doesn't connect to contracts**
   - Verify contract addresses in `client/src/contract-addresses.json`
   - Ensure MetaMask is connected to the correct network

3. **npm start fails**
   - Delete `node_modules` folder and run `npm install` again
   - Clear npm cache: `npm cache clean --force`

## Available Scripts

- `npm run deploy` - Deploys smart contracts to local network
- `npm start` - Starts the frontend application
- `npm test` - Runs test suite

## Project Structure

```
cargo-shipping-blockchain/
├── client/                 # React frontend
├── contracts/             # Smart contracts
├── scripts/              # Deployment scripts
├── test/                 # Contract tests
└── hardhat.config.js     # Hardhat configuration
```

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [React Documentation](https://reactjs.org/)
- [MetaMask Documentation](https://docs.metamask.io/)

## Support

For issues and support, please create an issue in the project repository.