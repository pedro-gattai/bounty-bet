import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useDiceGame } from '../lib/useDiceGame'
import { useDiceGameContext } from '../contexts/DiceGameContext'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaDice,
  FaWallet,
  FaCoins,
  FaTrophy,
  FaLock,
  FaCheckCircle,
  FaSpinner,
  FaArrowRight,
  FaRobot,
  FaCopy,
  FaRandom,
  FaUsers,
  FaCloudDownloadAlt,
} from 'react-icons/fa'

type SetupMode = 'choose' | 'create' | 'join'
type GameState = 'setup' | 'waiting_opponent' | 'playing' | 'rolling' | 'finished'

const DiceGamePage = () => {
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const { program, loading: programLoading, error: programError } = useDiceGameContext()
  const {
    createGame,
    joinGame,
    rollDice,
    fetchGameAccount,
    isProgramReady,
    claimPrize,
    checkBalance,
    requestAirdrop,
  } = useDiceGame()

  const [setupMode, setSetupMode] = useState<SetupMode>('choose')
  const [gameState, setGameState] = useState<GameState>('setup')
  const [betAmount, setBetAmount] = useState('0.1')
  const [currentGameId, setCurrentGameId] = useState<BN | null>(null)
  const [gameIdInput, setGameIdInput] = useState('')
  const [showGameId, setShowGameId] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState(false)
  const [prizeClaimAttempted, setPrizeClaimAttempted] = useState(false)

  // Dice rolls
  const [playerRoll, setPlayerRoll] = useState<{ dice1: number; dice2: number; total: number } | null>(null)
  const [opponentRoll, setOpponentRoll] = useState<{ dice1: number; dice2: number; total: number } | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [winner, setWinner] = useState<'player' | 'opponent' | 'tie' | null>(null)

  // Loading states
  const [loading, setLoading] = useState(false)

  // Escrow info
  const [totalEscrow, setTotalEscrow] = useState(0)

  // Check if program is ready
  useEffect(() => {
    const checkProgram = async () => {
      const ready = await isProgramReady()
      if (ready && programError) {
        console.log('Program recovered from error')
      }
    }
    checkProgram()
  }, [program, programError, isProgramReady])

  // Check balance periodically
  useEffect(() => {
    if (!publicKey) return

    const updateBalance = async () => {
      const bal = await checkBalance(publicKey)
      setBalance(bal)
    }

    updateBalance()
    const interval = setInterval(updateBalance, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [publicKey, checkBalance])

  // Helper functions for Game ID
  const generateGameId = () => {
    const randomId = Math.floor(100000 + Math.random() * 900000)
    setGameIdInput(randomId.toString())
    return randomId
  }

  const handleRequestAirdrop = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected')
      return
    }

    setIsRequestingAirdrop(true)
    try {
      await requestAirdrop(publicKey, 1)
      toast.success('1 SOL airdropped successfully!')

      // Update balance
      const newBalance = await checkBalance(publicKey)
      setBalance(newBalance)
    } catch (error: any) {
      toast.error(error.message || 'Failed to request airdrop')
    } finally {
      setIsRequestingAirdrop(false)
    }
  }

  const copyGameId = () => {
    if (currentGameId) {
      navigator.clipboard.writeText(currentGameId.toString())
      toast.success('Game ID copied to clipboard!')
    }
  }

  const handleCreateGame = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected')
      return
    }

    if (!gameIdInput) {
      toast.error('Please enter or generate a Game ID')
      return
    }

    if (parseFloat(betAmount) < 0.01) {
      toast.error('Minimum bet is 0.01 SOL')
      return
    }

    // Check balance (bet + ~0.05 for fees)
    const requiredBalance = parseFloat(betAmount) + 0.05
    if (balance < requiredBalance) {
      toast.error(`Insufficient balance! You need at least ${requiredBalance.toFixed(2)} SOL`)
      return
    }

    const isReady = await isProgramReady()
    if (!isReady) {
      toast.error('Program not initialized. Please reconnect your wallet.')
      return
    }

    setLoading(true)
    try {
      const newGameId = new BN(gameIdInput)
      const entryFee = new BN(parseFloat(betAmount) * LAMPORTS_PER_SOL)

      console.log('Creating game with params:', {
        gameId: newGameId.toString(),
        entryFee: entryFee.toString(),
        maxPlayers: 2
      })

      await createGame(newGameId, entryFee, 2)

      setCurrentGameId(newGameId)
      setIsCreator(true)
      setGameState('waiting_opponent')
      setTotalEscrow(parseFloat(betAmount))
      setShowGameId(true)

      toast.success(`Game created! Share ID: ${newGameId.toString()}`)
    } catch (error: any) {
      console.error('Error creating game:', error)
      const errorMessage = error?.message || 'Failed to create game'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected')
      return
    }

    if (!gameIdInput) {
      toast.error('Please enter a Game ID')
      return
    }

    // Check balance (bet + ~0.05 for fees)
    const requiredBalance = parseFloat(betAmount) + 0.05
    if (balance < requiredBalance) {
      toast.error(`Insufficient balance! You need at least ${requiredBalance.toFixed(2)} SOL`)
      return
    }

    const isReady = await isProgramReady()
    if (!isReady) {
      toast.error('Program not initialized. Please reconnect your wallet.')
      return
    }

    setLoading(true)
    try {
      const joinGameId = new BN(gameIdInput)

      await joinGame(joinGameId)

      setCurrentGameId(joinGameId)
      setIsCreator(false)
      setGameState('playing')
      setTotalEscrow(parseFloat(betAmount) * 2)

      toast.success('Joined game! Ready to roll dice!')
    } catch (error: any) {
      console.error('Error joining game:', error)
      const errorMessage = error?.message || 'Failed to join game. Make sure the Game ID is correct.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRollDice = async () => {
    if (!publicKey || !currentGameId) {
      toast.error('Invalid game state')
      return
    }

    const isReady = await isProgramReady()
    if (!isReady) {
      toast.error('Program not initialized. Please reconnect your wallet.')
      return
    }

    setIsRolling(true)
    setGameState('rolling')

    try {
      // Call the rollDice method on the smart contract
      await rollDice(currentGameId)

      // Fetch the updated game state
      const game = await fetchGameAccount(currentGameId)
      if (game) {
        // Find player's roll in the game data
        const playerIndex = (game.players as PublicKey[]).findIndex((p: PublicKey) => p.equals(publicKey))
        const roll = (game.rolls as any[])[playerIndex]

        if (roll) {
          setPlayerRoll({
            dice1: roll.dice1,
            dice2: roll.dice2,
            total: roll.total
          })
        }

        // Check if opponent has rolled
        const opponentIndex = 1 - playerIndex
        const oppRoll = (game.rolls as any[])[opponentIndex]
        if (oppRoll) {
          setOpponentRoll({
            dice1: oppRoll.dice1,
            dice2: oppRoll.dice2,
            total: oppRoll.total
          })
        }

        // Check if game is completed
        if ((game.status as any).completed) {
          determineWinner(roll?.total || 0, oppRoll?.total || 0)
        }
      }

      toast.success('Dice rolled!')
    } catch (error: any) {
      console.error('Error rolling dice:', error)
      const errorMessage = error?.message || 'Failed to roll dice'
      toast.error(errorMessage)
    } finally {
      setIsRolling(false)
    }
  }

  const determineWinner = (playerTotal: number, opponentTotal: number) => {
    if (playerTotal > opponentTotal) {
      setWinner('player')
      toast.success(`You won! ${playerTotal} vs ${opponentTotal}. Prize distributed automatically!`)
    } else if (opponentTotal > playerTotal) {
      setWinner('opponent')
      toast.error(`You lost. ${playerTotal} vs ${opponentTotal}`)
    } else {
      setWinner('tie')
      toast(`It's a tie! ${playerTotal} vs ${opponentTotal}`)
    }
    setGameState('finished')
  }

  // Poll for game updates and auto-claim prize
  useEffect(() => {
    if (!currentGameId || !publicKey) {
      console.log('[POLLING] Skipping - no gameId or publicKey')
      return
    }

    console.log('[POLLING] Starting polling for game:', currentGameId.toString(), 'Current state:', gameState)

    const interval = setInterval(async () => {
      try {
        console.log('[POLLING] Fetching game account...')
        const game = await fetchGameAccount(currentGameId)

        if (!game) {
          console.log('[POLLING] Game account not found')
          return
        }

        console.log('[POLLING] Game data:', {
          status: game.status,
          currentPlayers: game.currentPlayers,
          prizeClaimed: game.prizeClaimed,
          winner: game.winner?.toBase58(),
          totalPool: game.totalPool.toString()
        })

        // Check if opponent joined
        if (gameState === 'waiting_opponent' && game.currentPlayers === 2) {
          console.log('[POLLING] Opponent joined! Changing to playing state')
          setGameState('playing')
          setTotalEscrow(parseFloat(betAmount) * 2)
          toast.success('Opponent joined! Game started!')
        }

        // Check if game completed and auto-claim prize
        if ((game.status as any).completed) {
          console.log('[POLLING] Game is COMPLETED!')

          if (!game.prizeClaimed) {
            console.log('[POLLING] Prize NOT claimed yet')

            if (!prizeClaimAttempted) {
              console.log('[POLLING] No claim attempt made yet')

              const isWinner = game.winner && (game.winner as PublicKey).equals(publicKey)
              console.log('[POLLING] Am I the winner?', isWinner, 'My key:', publicKey.toBase58(), 'Winner:', game.winner?.toBase58())

              if (isWinner) {
                console.log('[POLLING] ✅ I WON! Attempting to claim prize...')
                setPrizeClaimAttempted(true)
                toast.success('You won! Claiming prize...')

                try {
                  // Check balance before claiming
                  console.log('[POLLING] Checking wallet balance...')
                  const balance = await checkBalance(publicKey)
                  console.log('[POLLING] Current balance:', balance, 'SOL')

                  // If balance is too low, request airdrop first
                  if (balance < 0.0001) {
                    console.log('[POLLING] Balance too low! Requesting airdrop...')
                    toast.info('Balance too low. Requesting airdrop...')

                    try {
                      await requestAirdrop(publicKey, 0.1)
                      console.log('[POLLING] Airdrop successful!')
                      toast.success('Airdrop received! Now claiming prize...')

                      // Wait a bit for the airdrop to be confirmed
                      await new Promise(resolve => setTimeout(resolve, 2000))
                    } catch (airdropError: any) {
                      console.error('[POLLING] Airdrop failed:', airdropError)
                      toast.error('Airdrop failed. You need SOL to claim the prize.')
                      setPrizeClaimAttempted(false)
                      return
                    }
                  }

                  console.log('[POLLING] Calling claimPrize...')
                  const tx = await claimPrize(currentGameId)
                  console.log('[POLLING] Claim prize TX:', tx)

                  const prizeAmount = (game.totalPool.toNumber() * 0.975) / LAMPORTS_PER_SOL
                  toast.success(`Prize of ${prizeAmount.toFixed(2)} SOL claimed!`)
                  console.log('[POLLING] Prize claimed successfully:', prizeAmount, 'SOL')

                  setGameState('finished')
                  setWinner('player')
                } catch (error: any) {
                  console.error('[POLLING] ❌ Error claiming prize:', error)
                  console.error('[POLLING] Error details:', error.message, error.logs)
                  toast.error('Failed to claim prize. Try the manual button.')
                  setPrizeClaimAttempted(false) // Reset to allow manual retry
                }
              } else {
                console.log('[POLLING] I lost. Winner is:', game.winner?.toBase58())
                setGameState('finished')
                setWinner('opponent')
              }
            } else {
              console.log('[POLLING] Claim already attempted, waiting...')
            }
          } else {
            console.log('[POLLING] Prize already claimed!')
          }
        } else {
          console.log('[POLLING] Game not completed yet, status:', game.status)
        }
      } catch (error) {
        console.error('[POLLING] Error polling game:', error)
      }
    }, 3000)

    return () => {
      console.log('[POLLING] Stopping polling')
      clearInterval(interval)
    }
  }, [currentGameId, gameState, betAmount, publicKey, fetchGameAccount, claimPrize, prizeClaimAttempted])

  const DiceDisplay = ({ roll, label }: { roll: { dice1: number; dice2: number; total: number } | null; label: string }) => (
    <div className="text-center">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      {roll ? (
        <div className="flex gap-4 justify-center">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-3xl font-bold text-gray-900">
            {roll.dice1}
          </div>
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-3xl font-bold text-gray-900">
            {roll.dice2}
          </div>
        </div>
      ) : (
        <div className="flex gap-4 justify-center">
          <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
            <FaDice className="text-gray-500 text-2xl" />
          </div>
          <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
            <FaDice className="text-gray-500 text-2xl" />
          </div>
        </div>
      )}
      {roll && (
        <p className="mt-2 text-xl font-bold">Total: {roll.total}</p>
      )}
    </div>
  )

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass text-center py-16"
        >
          <FaWallet className="text-6xl text-primary-400 mx-auto mb-6 animate-float" />
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 text-lg">
            Connect your Solana wallet to start playing dice games
          </p>
        </motion.div>
      </div>
    )
  }

  // Show loading state while program initializes
  if (programLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass text-center py-16"
        >
          <FaSpinner className="text-6xl text-primary-400 mx-auto mb-6 animate-spin" />
          <h2 className="text-3xl font-bold mb-4">Initializing Game Program...</h2>
          <p className="text-gray-400 text-lg">
            Setting up the dice game smart contract
          </p>
        </motion.div>
      </div>
    )
  }

  // Show error state if program failed to initialize
  if (programError && !program) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass text-center py-16 border-red-500/30"
        >
          <div className="text-6xl mx-auto mb-6">⚠️</div>
          <h2 className="text-3xl font-bold mb-4 text-red-400">Program Initialization Error</h2>
          <p className="text-gray-400 text-lg mb-4">
            {programError}
          </p>
          <p className="text-sm text-gray-500">
            Please try reconnecting your wallet or refreshing the page
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <FaDice className="inline mr-3 text-primary-400" />
          1v1 <span className="text-gradient">Dice Battle</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Challenge an opponent to a dice duel - highest roll wins the entire pot!
        </p>
      </motion.div>

      {/* Escrow Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-glass mb-8 bg-gradient-to-r from-primary-900/20 to-secondary-900/20 border-primary-500/20"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaLock className="text-primary-400 text-2xl" />
              <div>
                <h3 className="text-lg font-semibold">Smart Contract Escrow</h3>
                <p className="text-sm text-gray-400">
                  <FaRobot className="inline mr-1" />
                  Automatic prize distribution - no arbiter needed!
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gradient">
                {totalEscrow.toFixed(2)} SOL
              </p>
              <p className="text-sm text-gray-400">Total Prize Pool</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet Balance Display */}
      {connected && publicKey && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass mb-6 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaWallet className="text-primary-400 text-xl" />
              <div>
                <p className="text-sm text-gray-400">Your Balance</p>
                <p className={`text-2xl font-bold ${balance < 0.2 ? 'text-red-400' : 'text-green-400'}`}>
                  {balance.toFixed(4)} SOL
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestAirdrop}
              disabled={isRequestingAirdrop}
              className="btn-secondary px-4 py-2 text-sm"
            >
              {isRequestingAirdrop ? (
                <FaSpinner className="inline animate-spin mr-2" />
              ) : (
                <FaCloudDownloadAlt className="inline mr-2" />
              )}
              Request 1 SOL
            </button>
          </div>
        </motion.div>
      )}

      {/* Game States */}
      <AnimatePresence mode="wait">
        {/* Setup State */}
        {gameState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-glass p-8"
          >
            {setupMode === 'choose' && (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">Choose Your Action</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <button
                    onClick={() => setSetupMode('create')}
                    className="p-8 bg-gradient-to-br from-primary-900/40 to-primary-700/20 border-2 border-primary-500/50 rounded-lg hover:border-primary-400 transition-all"
                  >
                    <FaCoins className="text-5xl text-primary-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Create New Game</h3>
                    <p className="text-gray-400 text-sm">
                      Start a new game and invite others to join
                    </p>
                  </button>
                  <button
                    onClick={() => setSetupMode('join')}
                    className="p-8 bg-gradient-to-br from-secondary-900/40 to-secondary-700/20 border-2 border-secondary-500/50 rounded-lg hover:border-secondary-400 transition-all"
                  >
                    <FaUsers className="text-5xl text-secondary-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Join Existing Game</h3>
                    <p className="text-gray-400 text-sm">
                      Enter a Game ID to join an existing game
                    </p>
                  </button>
                </div>
              </>
            )}

            {setupMode === 'create' && (
              <>
                <button
                  onClick={() => setSetupMode('choose')}
                  className="btn-secondary mb-4 px-4 py-2 text-sm"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-6">Create New Game</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Game ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={gameIdInput}
                        onChange={(e) => setGameIdInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="Generate a Game ID"
                        className="input-field flex-1"
                      />
                      <button
                        onClick={generateGameId}
                        className="btn-secondary px-4 py-3 whitespace-nowrap"
                        title="Generate random Game ID"
                      >
                        <FaRandom className="inline mr-2" />
                        Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Bet Amount (SOL)
                    </label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      step="0.01"
                      min="0.01"
                      className="input-field w-full text-xl font-bold"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required: {(parseFloat(betAmount) + 0.05).toFixed(2)} SOL (bet + fees)
                    </p>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400">
                      <FaRobot className="inline mr-2" />
                      The smart contract automatically determines the winner and distributes the prize!
                    </p>
                  </div>

                  <button
                    onClick={handleCreateGame}
                    disabled={loading || !gameIdInput || balance < parseFloat(betAmount) + 0.05}
                    className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <FaSpinner className="animate-spin mx-auto" />
                    ) : (
                      <>
                        <FaCoins className="inline mr-2" />
                        Create Game ({betAmount} SOL)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {setupMode === 'join' && (
              <>
                <button
                  onClick={() => setSetupMode('choose')}
                  className="btn-secondary mb-4 px-4 py-2 text-sm"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-6">Join Existing Game</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Game ID
                    </label>
                    <input
                      type="text"
                      value={gameIdInput}
                      onChange={(e) => setGameIdInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter the 6-digit Game ID"
                      className="input-field w-full text-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Bet Amount (SOL)
                    </label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      step="0.01"
                      min="0.01"
                      className="input-field w-full text-xl font-bold"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required: {(parseFloat(betAmount) + 0.05).toFixed(2)} SOL (bet + fees)
                    </p>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-400">
                      Make sure you have the correct Game ID from the game creator!
                    </p>
                  </div>

                  <button
                    onClick={handleJoinGame}
                    disabled={loading || !gameIdInput || balance < parseFloat(betAmount) + 0.05}
                    className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <FaSpinner className="animate-spin mx-auto" />
                    ) : (
                      <>
                        <FaArrowRight className="inline mr-2" />
                        Join Game ({betAmount} SOL)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Waiting for Opponent */}
        {gameState === 'waiting_opponent' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-glass p-8 text-center"
          >
            <FaSpinner className="text-5xl text-primary-400 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Waiting for Opponent...</h2>
            <p className="text-gray-400 mb-6">
              Share this Game ID with your opponent. They need to join with {betAmount} SOL.
            </p>

            {/* Game ID Display */}
            {showGameId && currentGameId && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-md mx-auto">
                <p className="text-sm text-gray-400 mb-2">Share this Game ID:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-bold text-primary-400 bg-gray-900 px-4 py-3 rounded">
                    {currentGameId.toString()}
                  </code>
                  <button
                    onClick={copyGameId}
                    className="btn-secondary px-4 py-3"
                    title="Copy to clipboard"
                  >
                    <FaCopy className="inline" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Playing State */}
        {(gameState === 'playing' || gameState === 'rolling') && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass p-6">
                <DiceDisplay roll={playerRoll} label="Your Roll" />
              </div>
              <div className="card-glass p-6">
                <DiceDisplay roll={opponentRoll} label="Opponent's Roll" />
              </div>
            </div>

            {!playerRoll && (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <button
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="btn-primary px-12 py-4 text-xl"
                >
                  {isRolling ? (
                    <>
                      <FaSpinner className="inline mr-2 animate-spin" />
                      Rolling...
                    </>
                  ) : (
                    <>
                      <FaDice className="inline mr-2" />
                      Roll Your Dice!
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {playerRoll && !opponentRoll && (
              <div className="text-center">
                <p className="text-gray-400">Waiting for opponent to roll...</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Finished State */}
        {gameState === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card-glass p-8 text-center"
          >
            {winner === 'player' && (
              <>
                <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-6 animate-bounce" />
                <h2 className="text-3xl font-bold mb-4 text-gradient">You Won!</h2>
                <p className="text-gray-400 mb-2">
                  Your roll: {playerRoll?.total} | Opponent: {opponentRoll?.total}
                </p>
                <p className="text-lg text-green-400">
                  <FaCheckCircle className="inline mr-2" />
                  Prize of {(totalEscrow * 0.975).toFixed(2)} SOL has been sent to your wallet!
                </p>
                <p className="text-sm text-gray-500 mt-2">(2.5% platform fee)</p>
              </>
            )}

            {winner === 'opponent' && (
              <>
                <div className="text-6xl mx-auto mb-6">😔</div>
                <h2 className="text-3xl font-bold mb-4">You Lost</h2>
                <p className="text-gray-400">
                  Your roll: {playerRoll?.total} | Opponent: {opponentRoll?.total}
                </p>
                <p className="text-gray-500">Better luck next time!</p>
              </>
            )}

            {winner === 'tie' && (
              <>
                <div className="text-6xl mx-auto mb-6">🤝</div>
                <h2 className="text-3xl font-bold mb-4">It's a Tie!</h2>
                <p className="text-gray-400">
                  Both rolled: {playerRoll?.total}
                </p>
                <p className="text-gray-500">Funds returned to both players</p>
              </>
            )}

            {/* Manual Claim Button (Fallback) */}
            {winner === 'player' && currentGameId && !prizeClaimAttempted && (
              <button
                onClick={async () => {
                  if (!publicKey) return

                  setPrizeClaimAttempted(true)
                  try {
                    // Check balance before claiming
                    const currentBalance = await checkBalance(publicKey)
                    console.log('[MANUAL CLAIM] Current balance:', currentBalance, 'SOL')

                    // If balance is too low, request airdrop first
                    if (currentBalance < 0.0001) {
                      console.log('[MANUAL CLAIM] Balance too low! Requesting airdrop...')
                      toast.info('Balance too low. Requesting airdrop...')

                      try {
                        await requestAirdrop(publicKey, 0.1)
                        toast.success('Airdrop received!')
                        await new Promise(resolve => setTimeout(resolve, 2000))
                      } catch (airdropError: any) {
                        console.error('[MANUAL CLAIM] Airdrop failed:', airdropError)
                        toast.error('Airdrop failed. You need SOL to claim the prize.')
                        setPrizeClaimAttempted(false)
                        return
                      }
                    }

                    toast.success('Claiming prize manually...')
                    const tx = await claimPrize(currentGameId)
                    toast.success('Prize claimed! TX: ' + tx.slice(0, 8) + '...')
                  } catch (error: any) {
                    toast.error('Failed: ' + error.message)
                    setPrizeClaimAttempted(false)
                  }
                }}
                className="btn-secondary px-8 py-3 mb-4"
              >
                <FaCoins className="inline mr-2" />
                Claim Prize Manually
              </button>
            )}

            <button
              onClick={() => {
                setSetupMode('choose')
                setGameState('setup')
                setPlayerRoll(null)
                setOpponentRoll(null)
                setWinner(null)
                setTotalEscrow(0)
                setCurrentGameId(null)
                setGameIdInput('')
                setShowGameId(false)
                setIsCreator(false)
                setPrizeClaimAttempted(false)
              }}
              className="btn-primary px-8 py-3 mt-8"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DiceGamePage