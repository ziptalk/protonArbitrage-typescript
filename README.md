# Proton Arbitrage Bot

A TypeScript-based arbitrage trading bot that monitors and executes trades across multiple cryptocurrency exchanges including Binance, Astroport, and Duality.

## Features

- Real-time price monitoring across multiple exchanges
- Automated arbitrage opportunity detection
- Support for multiple trading pairs
- WebSocket integration for real-time market data
- Configurable trading parameters
- Integration with multiple DeFi protocols

## Prerequisites

- Node.js (v14 or higher)
- TypeScript
- Binance API credentials
- Cosmos wallet with mnemonic
- Access to Neutron network

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Copy the environment configuration:
```bash
cp .env.example .env
```
4. Configure your `.env` file with your API keys and settings

## Configuration

Configure the following environment variables in your `.env` file:

- Binance API credentials
- Cosmos wallet mnemonic
- RPC URLs

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

You can also use PM2 for process management:
```bash
pm2 start ecosystem.config.js
```

## Project Structure

- `/src`
  - `/arbitrage` - Arbitrage strategies implementation
  - `/exchange` - Exchange-specific implementations
    - `/binance` - Binance exchange integration
    - `/duality` - Duality protocol integration
    - `/astroport` - Astroport protocol integration
  - `/types` - TypeScript type definitions
  - `/util` - Utility functions and helpers

## Scripts

- `npm run build` - Build the TypeScript code
- `npm run start` - Start the production server
- `npm run dev` - Start the development server with hot-reload
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run format` - Format code using Prettier

## License

ISC
