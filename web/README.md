# NextTrope - Blockchain Escrow Platform

A secure escrow platform for digital and physical goods built with Next.js, shadcn/ui, and Reown AppKit.

## Features

- **Secure Escrow**: Smart contract-based escrow system for secure transactions
- **Dispute Resolution**: Third-party arbitration for resolving disputes
- **Multi-Token Support**: Support for ETH and ERC-20 tokens
- **Wallet Integration**: Connect with various wallets via Reown AppKit
- **Dark Mode**: Full dark mode support

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
