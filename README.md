# NextTrope

A secure blockchain escrow platform for digital and physical goods built with Next.js, shadcn/ui, and smart contracts.

## Project Structure

This monorepo contains:

- `web/`: Frontend application built with Next.js and shadcn/ui
- `chain/`: Smart contracts built with Solidity and Hardhat

## Getting Started

### Web Application

```bash
cd web
npm install
npm run dev
```

### Smart Contracts

```bash
cd chain
npm install
npx hardhat compile
npx hardhat test
```

## Environment Variables

Copy the environment example files and fill in your own values:

```bash
cp web/.env.example web/.env.local
```

## License

MIT 