# Deployment Guide - Vault Betting Protocol

## Prerequisites

1. **Install Rust**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Install Solana CLI**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

3. **Install Anchor Framework**
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

4. **Configure Solana CLI for Devnet**
```bash
solana config set --url devnet
```

5. **Create a new wallet (if you don't have one)**
```bash
solana-keygen new
```

6. **Airdrop SOL for deployment**
```bash
solana airdrop 2
```

## Build and Deploy

### Step 1: Install Dependencies
```bash
cd vault-gaming-solana
npm install
```

### Step 2: Build the Smart Contract
```bash
anchor build
```

### Step 3: Get the Program ID
```bash
solana address -k target/deploy/vault_betting-keypair.json
```

### Step 4: Update Program ID
Update the program ID in:
- `Anchor.toml`
- `contracts/programs/vault_betting/src/lib.rs` (declare_id!)
- `client/src/contexts/ProgramContext.tsx`

### Step 5: Build Again with New ID
```bash
anchor build
```

### Step 6: Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Step 7: Verify Deployment
```bash
solana program show <PROGRAM_ID> --url devnet
```

## Testing

### Run Tests Locally
```bash
anchor test
```

### Run Tests on Devnet
```bash
anchor test --provider.cluster devnet
```

## Client Application

### Step 1: Install Client Dependencies
```bash
cd client
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the `client` directory (copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Solana Network (devnet, testnet, or mainnet-beta)
VITE_SOLANA_NETWORK=devnet

# Optional: Custom RPC Endpoint (faster than public RPC)
# VITE_RPC_ENDPOINT=https://api.devnet.solana.com

# Dice Game Program ID (from your deployment)
VITE_DICE_GAME_PROGRAM_ID=YOUR_PROGRAM_ID_HERE
```

### Step 3: Run Development Server
```bash
npm run dev
```

### Step 4: Build for Production
```bash
npm run build
```

The build will be created in `client/dist/` directory.

## Frontend Deployment (Cloudflare Pages / Vercel / Netlify)

### Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Connect your GitHub repository

2. **Build Configuration**
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `client`

3. **Environment Variables**
   Add these in Cloudflare Pages settings:
   ```
   VITE_SOLANA_NETWORK=devnet
   VITE_DICE_GAME_PROGRAM_ID=YOUR_PROGRAM_ID
   ```

4. **Deploy**
   - Push to your repository
   - Cloudflare will automatically build and deploy

### Vercel

1. **Import Project**
   ```bash
   vercel
   ```

2. **Configure**
   - Root directory: `client`
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment Variables**
   Add in Vercel dashboard or via CLI:
   ```bash
   vercel env add VITE_SOLANA_NETWORK
   vercel env add VITE_DICE_GAME_PROGRAM_ID
   ```

### Netlify

1. **Deploy**
   ```bash
   cd client
   netlify deploy --prod
   ```

2. **Configuration** (netlify.toml)
   ```toml
   [build]
     base = "client"
     command = "npm run build"
     publish = "dist"
   ```

3. **Environment Variables**
   Add in Netlify dashboard under Site settings → Environment variables

### Important Notes for Production

- **IDL Files**: The IDL files (`client/src/idl/*.json`) must be committed to your repository
- **Workflow**: When you update your Solana program:
  1. Run `anchor build` locally
  2. Copy updated IDL: `cp target/idl/dice_game.json client/src/idl/`
  3. Update `VITE_DICE_GAME_PROGRAM_ID` if program ID changed
  4. Commit and push changes
  5. Frontend will auto-deploy with new IDL

## Troubleshooting

### "Insufficient funds" Error
```bash
solana airdrop 2
```

### Program Already Exists
```bash
solana program close <PROGRAM_ID> --bypass-warning
```
Then redeploy.

### Transaction Too Large
Reduce the size of your instructions or split them into multiple transactions.

### RPC Rate Limiting
Use a custom RPC endpoint:
```bash
solana config set --url https://api.devnet.solana.com
```

## Useful Commands

### Check Balance
```bash
solana balance
```

### View Program Logs
```bash
solana logs <PROGRAM_ID>
```

### Get Transaction Details
```bash
solana confirm -v <TX_HASH>
```

### List Programs
```bash
solana program list
```

## Production Deployment

For mainnet deployment:

1. **Change network configuration**
```bash
solana config set --url mainnet-beta
```

2. **Update Anchor.toml**
```toml
[provider]
cluster = "mainnet"
```

3. **Ensure sufficient SOL for deployment**
Mainnet deployment requires approximately 2-3 SOL

4. **Deploy**
```bash
anchor deploy --provider.cluster mainnet
```

## Monitoring

### View Program Activity
```bash
solana logs <PROGRAM_ID> --url devnet
```

### Check Program Authority
```bash
solana program show <PROGRAM_ID> --url devnet
```

### Transfer Program Authority (if needed)
```bash
solana program set-upgrade-authority <PROGRAM_ID> <NEW_AUTHORITY> --url devnet
```

## Security Checklist

Before mainnet deployment:
- [ ] Audit smart contract code
- [ ] Test all edge cases
- [ ] Verify access controls
- [ ] Check for reentrancy vulnerabilities
- [ ] Validate all inputs
- [ ] Test with multiple wallets
- [ ] Verify fee calculations
- [ ] Test time-based constraints
- [ ] Document all known limitations

## Support

For issues or questions, please refer to:
- [Solana Documentation](https://docs.solana.com)
- [Anchor Documentation](https://www.anchor-lang.com)
- [Project Repository](https://github.com/yourusername/vault-gaming-solana)