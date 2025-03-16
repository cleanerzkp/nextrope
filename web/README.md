# NextEscrow - Blockchain Escrow Platform

A secure escrow platform for physical goods built with Next.js, shadcn/ui, and Reown AppKit.

## Deployed Contract & Demo

- **Contract Address**: [0x5e3b94f2ea6ed8ea07c83abfac8e9b6d52efa511](https://sepolia.etherscan.io/address/0x5e3b94f2ea6ed8ea07c83abfac8e9b6d52efa511#code)
- **View on Etherscan**: 
  - [Contract Code](https://sepolia.etherscan.io/address/0x5e3b94f2ea6ed8ea07c83abfac8e9b6d52efa511#code)
  - [Read Contract](https://sepolia.etherscan.io/address/0x5e3b94f2ea6ed8ea07c83abfac8e9b6d52efa511#readContract)
  - [Write Contract](https://sepolia.etherscan.io/address/0x5e3b94f2ea6ed8ea07c83abfac8e9b6d52efa511#writeContract)
- **Live Demo**: [https://nextrope-git-main-cleanerzkps-projects.vercel.app/](https://nextrope-git-main-cleanerzkps-projects.vercel.app/)

## Features

- **Escrow System**: Smart contract-based escrow system for transactions of physical goods
- **Dispute Resolution**: Third-party arbitration for resolving disputes between buyers and sellers
- **Multi-Token Support**: Support for ETH and any ERC-20 token
- **Wallet Integration**: Connect with various wallets via Reown AppKit
- **Dark Mode**: Full dark mode support

## Test Task Implemented

This project implements a solution for the following test task:

```
Write a smart contract handling agreements between two users for selling physical items 
in exchange for ETH or any ERC-20 token. In case of disputes, the role of an arbiter 
resolving the dispute should be included.

Acceptance criteria:
1) Resistance to theft of funds from the contract
2) Dispute resolution by a third party
3) Support for any token in the ERC-20 standard

Technical criteria:
• Implementation in the Solidity language
• Automated tests with the ability to generate a coverage report
• Start-up documentation
```

Original task in Polish:
```
Zadanie testowe
Napisz smart kontrakt obsługujący umowy między dwoma użytkownikami na sprzedaż przedmiotu
materialnego w zamian za ETH lub dowolny token ERC-20. W przypadku sporów ma być
uwzględniona rola arbitra rozstrzygająca spór.

Kryteria akceptacyjne:
1) Odporność na kradzież środków z kontraktu
2) Rozstrzyganie sporu przez osobę trzecią
3) Obsługa dowolnego tokena w standardzie ERC-20

Kryteria techniczne:
• Implementacja w języku solidity
• Testy automatyczne z możliwością generowania raportu pokrycia
• Dokumentacja uruchomieniowa
```

## Technologies

- [Next.js](https://nextjs.org/) - React framework for server-rendered applications
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built with Radix UI and Tailwind CSS
- [Reown AppKit](https://reown.com) - Web3 wallet connection and transaction tooling
- [next-themes](https://github.com/pacocoursey/next-themes) - Dark mode support

## Project Structure

```
web/
├── src/
│   ├── app/              # App router routes and layouts
│   │   ├── arbitrate/     # Arbitrator pages
│   │   ├── create/        # Escrow creation pages
│   │   ├── escrows/       # Escrow listings and details
│   │   ├── learn/         # Educational content
│   │   ├── profile/       # User profile pages
│   │   └── ...           # Custom components
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── ...           # Custom components
│   ├── config/           # Reown AppKit configuration
│   ├── context/          # Context providers
│   └── lib/              # Utility functions
├── public/               # Static assets
└── ...                   # Config files
```

## Getting Started

1. Create a `.env.local` file in the root of the project with the following variables:

```bash
# Reown AppKit
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

The project uses the following environment variables:

```
# Reown AppKit
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id_here
```

Make sure to add these to your `.env.local` file for local development. The `.env.local` file is gitignored, so sensitive information won't be committed to the repository.

## Pages

- `/` - Home page with platform overview
- `/create` - Create new escrow agreements
- `/escrows` - View and manage your escrow agreements
- `/escrows/[id]` - View details and actions for a specific escrow
- `/arbitrate` - Arbitrate disputes between buyers and sellers
- `/profile` - User profile and settings
- `/learn` - Educational content about the platform

## Wallet Integration

This project uses Reown AppKit for wallet connection. Supported wallets include:

- MetaMask
- Coinbase Wallet
- WalletConnect compatible wallets
- And more via the AppKit modal

## Adding New Components

To add more shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

## Theming

- Dark mode is enabled via the ThemeProvider in the root layout
- The theme toggle component allows switching between light, dark, and system themes
- Custom theming can be done by modifying the CSS variables in `src/app/globals.css`
