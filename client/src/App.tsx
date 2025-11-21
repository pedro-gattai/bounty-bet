import { useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { Toaster } from 'react-hot-toast'

import { DiceGameProvider } from './contexts/DiceGameContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import MyBetsPage from './pages/MyBetsPage'
import DiceGamePage from './pages/DiceGamePage'
import DiceModeSelectorPage from './pages/DiceModeSelectorPage'
import DiceMultiplayerPage from './pages/DiceMultiplayerPage'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

function App() {
  // The network can be set via environment variable (default: devnet)
  const networkEnv = import.meta.env.VITE_SOLANA_NETWORK || 'devnet'
  const network = networkEnv === 'mainnet-beta'
    ? WalletAdapterNetwork.Mainnet
    : networkEnv === 'testnet'
    ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet

  // Use custom RPC endpoint if provided, otherwise use public RPC
  const endpoint = useMemo(() => {
    const customEndpoint = import.meta.env.VITE_RPC_ENDPOINT
    return customEndpoint || clusterApiUrl(network)
  }, [network])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <DiceGameProvider>
            <Router>
              <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dice" element={<DiceModeSelectorPage />} />
                  <Route path="/dice/battle" element={<DiceGamePage />} />
                  <Route path="/dice/multi" element={<DiceMultiplayerPage />} />
                  <Route path="/my-games" element={<MyBetsPage />} />
                </Routes>
              </main>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: '#1f2937',
                    color: '#f3f4f6',
                    border: '1px solid #374151',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#f3f4f6',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#f3f4f6',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </DiceGameProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App