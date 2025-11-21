import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useDiceGame, createDiceGame, joinDiceGame, rollDice, fetchGameAccount } from '../contexts/DiceGameContext'
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
} from 'react-icons/fa'

type GameState = 'setup' | 'waiting_opponent' | 'playing' | 'rolling' | 'finished'

const DiceGamePage = () => {
  const { connected, publicKey } = useWallet()
  const { program } = useDiceGame()

  const [gameState, setGameState] = useState<GameState>('setup')
  const [betAmount, setBetAmount] = useState('0.1')
  const [opponentAddress, setOpponentAddress] = useState('')
  const [gameAccount, setGameAccount] = useState<PublicKey | null>(null)

  // Dice rolls
  const [playerRoll, setPlayerRoll] = useState<{ dice1: number; dice2: number; total: number } | null>(null)
  const [opponentRoll, setOpponentRoll] = useState<{ dice1: number; dice2: number; total: number } | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [winner, setWinner] = useState<'player' | 'opponent' | 'tie' | null>(null)

  // Loading states
  const [loading, setLoading] = useState(false)

  // Escrow info
  const [totalEscrow, setTotalEscrow] = useState(0)

  const handleCreateGame = async () => {
    console.log('handleCreateGame called', { program, publicKey, opponentAddress, betAmount })

    if (!program || !publicKey) {
      toast.error('Wallet not connected')
      console.log('Failed: program or publicKey missing', { program, publicKey })
      return
    }

    if (!opponentAddress) {
      toast.error('Please enter opponent address')
      return
    }

    if (parseFloat(betAmount) < 0.01) {
      toast.error('Minimum bet is 0.01 SOL')
      return
    }

    setLoading(true)
    try {
      const newGameId = new BN(Date.now())
      const entryFee = new BN(parseFloat(betAmount) * LAMPORTS_PER_SOL)

      // Create the game with max 2 players for 1v1
      const { tx, gameAccount: account } = await createDiceGame(
        program,
        publicKey,
        newGameId,
        entryFee,
        2 // Max 2 players for 1v1
      )

      setGameAccount(account)
      setGameState('waiting_opponent')
      setTotalEscrow(parseFloat(betAmount))

      toast.success('Game created! Waiting for opponent to join...')
      console.log('Game created:', tx, 'Account:', account.toBase58())
    } catch (error) {
      console.error('Error creating game:', error)
      toast.error('Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async () => {
    if (!program || !publicKey || !gameAccount) {
      toast.error('Invalid game state')
      return
    }

    setLoading(true)
    try {
      await joinDiceGame(program, gameAccount, publicKey)

      setGameState('playing')
      setTotalEscrow(totalEscrow + parseFloat(betAmount))
      toast.success('Joined game! Ready to roll dice!')
    } catch (error) {
      console.error('Error joining game:', error)
      toast.error('Failed to join game')
    } finally {
      setLoading(false)
    }
  }

  const handleRollDice = async () => {
    if (!program || !publicKey || !gameAccount) {
      toast.error('Invalid game state')
      return
    }

    setIsRolling(true)
    setGameState('rolling')

    try {
      // Call the rollDice method on the smart contract
      await rollDice(program, gameAccount, publicKey)

      // Fetch the updated game state
      const game = await fetchGameAccount(program, gameAccount)
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
    } catch (error) {
      console.error('Error rolling dice:', error)
      toast.error('Failed to roll dice')
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

  // Poll for game updates
  useEffect(() => {
    if (!program || !gameAccount || gameState !== 'waiting_opponent') return

    const interval = setInterval(async () => {
      try {
        const game = await fetchGameAccount(program, gameAccount)
        if (game && game.currentPlayers === 2) {
          setGameState('playing')
          setTotalEscrow(parseFloat(betAmount) * 2)
          toast.success('Opponent joined! Game started!')
        }
      } catch (error) {
        console.error('Error fetching game:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [program, gameAccount, gameState, betAmount])

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
            <h2 className="text-2xl font-bold mb-6">Create New Game</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Opponent Wallet Address
                </label>
                <input
                  type="text"
                  value={opponentAddress}
                  onChange={(e) => setOpponentAddress(e.target.value)}
                  placeholder="Enter opponent's Solana address"
                  className="input-field w-full"
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
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <FaRobot className="inline mr-2" />
                  The smart contract automatically determines the winner and distributes the prize. No arbiter needed!
                </p>
              </div>

              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="btn-primary w-full py-4 text-lg"
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
              Share this game with your opponent. They need to join with {betAmount} SOL.
            </p>

            {/* Simulated join button for demo */}
            <button
              onClick={handleJoinGame}
              className="btn-secondary px-8 py-3"
            >
              <FaArrowRight className="inline mr-2" />
              Simulate Opponent Join (Demo)
            </button>
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

            <button
              onClick={() => {
                setGameState('setup')
                setPlayerRoll(null)
                setOpponentRoll(null)
                setWinner(null)
                setTotalEscrow(0)
                setGameAccount(null)
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