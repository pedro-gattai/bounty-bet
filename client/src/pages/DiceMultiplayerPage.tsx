import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useDiceGame, createDiceGame, rollDice, fetchGameAccount } from '../contexts/DiceGameContext'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaDice,
  FaWallet,
  FaCoins,
  FaTrophy,
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaSpinner,
  FaRobot,
  FaPlay,
} from 'react-icons/fa'

type GamePhase = 'waiting' | 'playing' | 'rolling' | 'finished'

interface Player {
  address: PublicKey
  joined: boolean
  diceRoll: { dice1: number; dice2: number; total: number } | null
  isWinner: boolean
}

const DiceMultiplayerPage = () => {
  const { connected, publicKey } = useWallet()
  const { program } = useDiceGame()

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting')
  const [gameAccount, setGameAccount] = useState<PublicKey | null>(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [isCreator, setIsCreator] = useState(false)

  // Players
  const [players, setPlayers] = useState<Player[]>([])
  const [isInGame, setIsInGame] = useState(false)

  // Timer
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [isRolling, setIsRolling] = useState(false)

  // Game settings
  const BET_AMOUNT = 0.1 // SOL
  const MAX_PLAYERS = 6
  const MIN_PLAYERS = 2
  const GAME_DURATION = 300 // 5 minutes

  // Timer countdown effect
  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            handleGameEnd()
            return 0
          }
          return newTime
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, gamePhase])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreateOrJoinGame = async () => {
    if (!program || !publicKey) {
      toast.error('Wallet not connected')
      return
    }

    try {
      // For demo, we'll create a new game or join existing one
      const newGameId = new BN(Date.now())
      const entryFee = new BN(BET_AMOUNT * LAMPORTS_PER_SOL)

      // Create the game
      const { tx, gameAccount: account } = await createDiceGame(
        program,
        publicKey,
        newGameId,
        entryFee,
        MAX_PLAYERS
      )

      setGameAccount(account)
      setIsCreator(true)
      setIsInGame(true)
      setPlayers([{
        address: publicKey,
        joined: true,
        diceRoll: null,
        isWinner: false
      }])

      toast.success('Multiplayer room created! Waiting for players...')
      console.log('Game created:', tx, 'Account:', account.toBase58())
    } catch (error) {
      console.error('Error creating/joining game:', error)
      toast.error('Failed to create/join game')
    }
  }

  // Unused for now - players join via handleCreateOrJoinGame
  // const handleJoinGame = async () => {
  //   if (!program || !publicKey || !gameAccount) {
  //     toast.error('Invalid game state')
  //     return
  //   }

  //   try {
  //     await joinDiceGame(program, gameAccount, publicKey)

  //     setIsInGame(true)
  //     setPlayers(prev => [...prev, {
  //       address: publicKey,
  //       joined: true,
  //       diceRoll: null,
  //       isWinner: false
  //     }])

  //     toast.success('Joined the game!')
  //   } catch (error) {
  //     console.error('Error joining game:', error)
  //     toast.error('Failed to join game')
  //   }
  // }

  const handleStartGame = async () => {
    if (!program || !gameAccount || !isCreator) {
      toast.error('Only the creator can start the game')
      return
    }

    if (players.length < MIN_PLAYERS) {
      toast.error(`Need at least ${MIN_PLAYERS} players to start`)
      return
    }

    try {
      // Call startGame method on the contract
      await program.methods
        .startGame()
        .accounts({
          gameAccount,
          starter: publicKey!,
        })
        .rpc()

      setGamePhase('playing')
      setTimeLeft(GAME_DURATION)
      toast.success('Game started! Roll your dice!')
    } catch (error) {
      console.error('Error starting game:', error)
      toast.error('Failed to start game')
    }
  }

  const handleRollDice = async () => {
    if (!program || !publicKey || !gameAccount) {
      toast.error('Invalid game state')
      return
    }

    setIsRolling(true)
    setGamePhase('rolling')

    try {
      // Roll dice on the blockchain
      await rollDice(program, gameAccount, publicKey)

      // Fetch updated game state
      const game = await fetchGameAccount(program, gameAccount)
      if (game) {
        // Update player rolls from game state
        const updatedPlayers = players.map((player, index) => {
          const roll = (game.rolls as any[])[index]
          if (roll && player.address.equals(publicKey)) {
            return {
              ...player,
              diceRoll: {
                dice1: roll.dice1,
                dice2: roll.dice2,
                total: roll.total
              }
            }
          }
          return player
        })
        setPlayers(updatedPlayers)

        // Check if all players have rolled
        const allRolled = (game.rolls as any[]).slice(0, (game as any).currentPlayers).every((r: any) => r !== null)
        if (allRolled && (game.status as any).completed) {
          handleGameEnd()
        }
      }

      toast.success('Dice rolled!')
    } catch (error) {
      console.error('Error rolling dice:', error)
      toast.error('Failed to roll dice')
    } finally {
      setIsRolling(false)
      if (gamePhase === 'rolling') {
        setGamePhase('playing')
      }
    }
  }

  const handleGameEnd = async () => {
    setGamePhase('finished')

    // Fetch final game state to determine winner
    if (program && gameAccount) {
      try {
        const game = await fetchGameAccount(program, gameAccount)
        if (game && (game as any).winner) {
          // Update players with winner info
          const updatedPlayers = players.map(player => ({
            ...player,
            isWinner: player.address.equals((game as any).winner)
          }))
          setPlayers(updatedPlayers)

          const winner = updatedPlayers.find(p => p.isWinner)
          if (winner) {
            toast.success(`Game Over! ${winner.address.equals(publicKey!) ? 'You' : 'Player'} won with a roll of ${winner.diceRoll?.total}!`)
          }
        }
      } catch (error) {
        console.error('Error fetching final game state:', error)
      }
    }
  }

  const resetGame = () => {
    setGamePhase('waiting')
    setPlayers([])
    setIsInGame(false)
    setTimeLeft(GAME_DURATION)
    setCurrentRound(currentRound + 1)
    setGameAccount(null)
    setIsCreator(false)
  }

  // Simulate players joining (for demo)
  const simulatePlayerJoin = () => {
    if (players.length >= MAX_PLAYERS) {
      toast.error('Room is full!')
      return
    }

    const fakeAddress = PublicKey.unique()
    setPlayers(prev => [...prev, {
      address: fakeAddress,
      joined: true,
      diceRoll: null,
      isWinner: false
    }])

    toast.success(`Player joined! (${players.length + 1}/${MAX_PLAYERS})`)

    if (players.length + 1 === MAX_PLAYERS) {
      toast('Room is full! Game will start soon.')
    }
  }

  // Simulate other players rolling (for demo)
  const simulateOthersRoll = () => {
    setPlayers(prev => prev.map(player => {
      if (!player.address.equals(publicKey!)) {
        return {
          ...player,
          diceRoll: {
            dice1: Math.floor(Math.random() * 6) + 1,
            dice2: Math.floor(Math.random() * 6) + 1,
            total: 0
          }
        }
      }
      return player
    }).map(p => ({
      ...p,
      diceRoll: p.diceRoll ? {
        ...p.diceRoll,
        total: p.diceRoll.dice1 + p.diceRoll.dice2
      } : null
    })))
  }

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
            Connect your Solana wallet to join the multiplayer arena
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <FaUsers className="inline mr-3 text-secondary-400" />
          Multiplayer <span className="text-gradient-purple">Arena</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Up to 6 players • 5-minute rounds • Winner takes all!
        </p>
      </motion.div>

      {/* Game Info Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-glass mb-6 bg-gradient-to-r from-secondary-900/20 to-purple-900/20 border-secondary-500/20"
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-400">Round</p>
                <p className="text-2xl font-bold">#{currentRound}</p>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div>
                <p className="text-sm text-gray-400">Entry Fee</p>
                <p className="text-2xl font-bold text-secondary-400">{BET_AMOUNT} SOL</p>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div>
                <p className="text-sm text-gray-400">Prize Pool</p>
                <p className="text-2xl font-bold text-gradient">
                  {(players.length * BET_AMOUNT * 0.975).toFixed(3)} SOL
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {gamePhase === 'playing' && (
                <div className="text-center">
                  <p className="text-sm text-gray-400">Time Remaining</p>
                  <p className="text-2xl font-bold text-red-400">
                    <FaClock className="inline mr-2" />
                    {formatTime(timeLeft)}
                  </p>
                </div>
              )}

              {gamePhase === 'waiting' && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2">
                  <p className="text-sm text-blue-400">
                    <FaRobot className="inline mr-2" />
                    Automatic prize distribution - no arbiter needed!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Players Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="card-glass">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
              <span>
                <FaUsers className="inline mr-2 text-secondary-400" />
                Players ({players.length}/{MAX_PLAYERS})
              </span>
              {gamePhase === 'waiting' && players.length < MAX_PLAYERS && (
                <button
                  onClick={simulatePlayerJoin}
                  className="text-sm btn-secondary px-3 py-1"
                >
                  Simulate Join
                </button>
              )}
            </h3>

            <div className="space-y-3">
              {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
                const player = players[i]
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      player
                        ? player.isWinner
                          ? 'bg-yellow-900/20 border-yellow-500/50'
                          : 'bg-gray-800/50 border-gray-700'
                        : 'bg-gray-900/50 border-gray-800 border-dashed'
                    }`}
                  >
                    {player ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            player.joined ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                          }`} />
                          <span className={player.address.equals(publicKey!) ? 'font-bold text-primary-400' : ''}>
                            {player.address.equals(publicKey!) ? 'You' : `Player ${i + 1}`}
                          </span>
                          {player.isWinner && (
                            <FaTrophy className="text-yellow-400 text-sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {player.diceRoll ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="w-6 h-6 bg-white text-gray-900 rounded flex items-center justify-center text-xs font-bold">
                                  {player.diceRoll.dice1}
                                </span>
                                <span className="w-6 h-6 bg-white text-gray-900 rounded flex items-center justify-center text-xs font-bold">
                                  {player.diceRoll.dice2}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-secondary-400">
                                = {player.diceRoll.total}
                              </span>
                            </div>
                          ) : gamePhase === 'playing' || gamePhase === 'rolling' ? (
                            <span className="text-gray-500 text-sm">Rolling...</span>
                          ) : (
                            <span className="text-gray-600 text-sm">Waiting</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-600 text-sm">
                        Waiting for player...
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Game Actions */}
        <div className="card-glass">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Waiting State */}
              {gamePhase === 'waiting' && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  {!isInGame ? (
                    <>
                      <FaDice className="text-6xl text-secondary-400 mx-auto mb-6 animate-bounce" />
                      <h3 className="text-2xl font-bold mb-4">Join the Arena!</h3>
                      <p className="text-gray-400 mb-6">
                        Entry fee: {BET_AMOUNT} SOL<br />
                        Winner takes the entire pool!
                      </p>
                      <button
                        onClick={handleCreateOrJoinGame}
                        className="btn-primary px-8 py-4 text-lg"
                      >
                        <FaCoins className="inline mr-2" />
                        Enter Arena ({BET_AMOUNT} SOL)
                      </button>
                    </>
                  ) : (
                    <>
                      <FaUsers className="text-5xl text-secondary-400 mx-auto mb-6" />
                      <h3 className="text-xl font-bold mb-4">Waiting for Players...</h3>
                      <p className="text-gray-400 mb-6">
                        {players.length}/{MAX_PLAYERS} players joined
                      </p>
                      {isCreator && players.length >= MIN_PLAYERS && (
                        <button
                          onClick={handleStartGame}
                          className="btn-primary px-6 py-3"
                        >
                          <FaPlay className="inline mr-2" />
                          Start Game
                        </button>
                      )}
                      {!isCreator && (
                        <p className="text-sm text-gray-500">
                          Waiting for the room creator to start the game...
                        </p>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Playing State */}
              {(gamePhase === 'playing' || gamePhase === 'rolling') && (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <FaDice className="text-6xl text-primary-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Game in Progress!</h3>

                  {!players.find(p => p.address.equals(publicKey!))?.diceRoll ? (
                    <>
                      <p className="text-gray-400 mb-6">Roll your dice to compete!</p>
                      <button
                        onClick={handleRollDice}
                        disabled={isRolling}
                        className="btn-primary px-8 py-4 text-lg"
                      >
                        {isRolling ? (
                          <>
                            <FaSpinner className="inline mr-2 animate-spin" />
                            Rolling...
                          </>
                        ) : (
                          <>
                            <FaDice className="inline mr-2" />
                            Roll Dice!
                          </>
                        )}
                      </button>

                      {/* Demo button to simulate others rolling */}
                      <button
                        onClick={simulateOthersRoll}
                        className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-400"
                      >
                        (Demo: Simulate other players rolling)
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-green-400 mb-2">
                        <FaCheckCircle className="inline mr-2" />
                        You rolled: {players.find(p => p.address.equals(publicKey!))?.diceRoll?.total}
                      </p>
                      <p className="text-gray-400">
                        Waiting for other players to roll...
                      </p>
                    </>
                  )}
                </motion.div>
              )}

              {/* Finished State */}
              {gamePhase === 'finished' && (
                <motion.div
                  key="finished"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  {players.find(p => p.address.equals(publicKey!))?.isWinner ? (
                    <>
                      <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-6 animate-bounce" />
                      <h3 className="text-3xl font-bold mb-4 text-gradient">You Won!</h3>
                      <p className="text-xl text-green-400 mb-2">
                        Prize: {(players.length * BET_AMOUNT * 0.975).toFixed(3)} SOL
                      </p>
                      <p className="text-sm text-gray-500">
                        <FaCheckCircle className="inline mr-1" />
                        Automatically sent to your wallet!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mx-auto mb-6">😔</div>
                      <h3 className="text-2xl font-bold mb-4">Game Over</h3>
                      <p className="text-gray-400">
                        Winner: Player {players.findIndex(p => p.isWinner) + 1}
                      </p>
                      <p className="text-gray-500">
                        Winning roll: {players.find(p => p.isWinner)?.diceRoll?.total}
                      </p>
                    </>
                  )}

                  <button
                    onClick={resetGame}
                    className="btn-primary px-6 py-3 mt-6"
                  >
                    Play Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-glass p-6 bg-gradient-to-r from-gray-900/50 to-gray-800/50"
      >
        <h3 className="text-lg font-bold mb-3">
          <FaDice className="inline mr-2 text-primary-400" />
          Arena Rules
        </h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Entry fee: {BET_AMOUNT} SOL per player</li>
          <li>• 2-6 players per round</li>
          <li>• Each player rolls two dice (2-12 total)</li>
          <li>• Highest roll wins the entire prize pool</li>
          <li>• Prize distributed automatically by smart contract</li>
          <li>• 2.5% platform fee deducted from winnings</li>
          <li>• No arbiter needed - fully trustless!</li>
        </ul>
      </motion.div>
    </div>
  )
}

export default DiceMultiplayerPage