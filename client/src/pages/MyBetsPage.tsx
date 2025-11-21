import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link } from 'react-router-dom'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaWallet,
  FaBolt,
  FaTrophy,
  FaCoins,
  FaDice,
  FaUsers,
  FaUser,
  FaArrowRight,
  FaHistory,
  FaGamepad,
  FaClock,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa'

type TabType = 'active' | 'history'

interface Game {
  id: string
  type: 'dice-1v1' | 'dice-multi'
  status: 'waiting' | 'playing' | 'finished' | 'cancelled'
  amount: number
  players: number
  maxPlayers: number
  result?: 'won' | 'lost' | 'draw'
  prize?: number
  createdAt: Date
  round?: number
}

const MyBetsPage = () => {
  const { publicKey, connected } = useWallet()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [historyGames, setHistoryGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (publicKey) {
      fetchUserGames()
    }
  }, [publicKey])

  const fetchUserGames = async () => {
    if (!publicKey) return

    try {
      // For demo purposes, we'll create mock data
      // In production, you'd query the blockchain for actual games

      // Mock active games
      setActiveGames([
        {
          id: '1',
          type: 'dice-multi',
          status: 'playing',
          amount: 0.1,
          players: 4,
          maxPlayers: 6,
          createdAt: new Date(),
          round: 42
        },
        {
          id: '2',
          type: 'dice-1v1',
          status: 'waiting',
          amount: 0.5,
          players: 1,
          maxPlayers: 2,
          createdAt: new Date()
        }
      ])

      // Mock history games
      setHistoryGames([
        {
          id: '3',
          type: 'dice-multi',
          status: 'finished',
          amount: 0.1,
          players: 6,
          maxPlayers: 6,
          result: 'won',
          prize: 0.48,
          createdAt: new Date(Date.now() - 3600000),
          round: 41
        },
        {
          id: '4',
          type: 'dice-1v1',
          status: 'finished',
          amount: 1.0,
          players: 2,
          maxPlayers: 2,
          result: 'lost',
          createdAt: new Date(Date.now() - 7200000)
        },
        {
          id: '5',
          type: 'dice-multi',
          status: 'finished',
          amount: 0.1,
          players: 5,
          maxPlayers: 6,
          result: 'won',
          prize: 0.4,
          createdAt: new Date(Date.now() - 86400000),
          round: 38
        }
      ])
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass text-center py-16"
        >
          <FaWallet className="text-6xl text-primary-400 mx-auto mb-6 animate-float" />
          <h2 className="text-3xl font-bold mb-4">Wallet Connection Required</h2>
          <p className="text-gray-400 text-lg">
            Connect your wallet to view your game history
          </p>
        </motion.div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="card-glass text-center py-16">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-400">Loading your games...</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: "Active Games",
      value: activeGames.length.toString(),
      icon: FaGamepad,
      color: "text-primary-400",
      bgColor: "bg-primary-500/20"
    },
    {
      label: "Games Won",
      value: historyGames.filter(g => g.result === 'won').length.toString(),
      icon: FaTrophy,
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      label: "Total Earnings",
      value: `${historyGames.reduce((sum, g) => sum + (g.prize || 0), 0).toFixed(2)} SOL`,
      icon: FaCoins,
      color: "text-secondary-400",
      bgColor: "bg-secondary-500/20"
    }
  ]

  const GameCard = ({ game }: { game: Game }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      className="card-glow"
    >
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {game.type === 'dice-multi' ? (
              <div className="w-10 h-10 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                <FaUsers className="text-secondary-400" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <FaUser className="text-primary-400" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold">
                {game.type === 'dice-multi' ? `Multiplayer Arena` : '1v1 Battle'}
                {game.round && ` #${game.round}`}
              </h3>
              <p className="text-sm text-gray-400">
                <FaDice className="inline mr-1" />
                Dice Game • {game.amount} SOL stake
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {/* Status Badge */}
            {game.status === 'waiting' && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center gap-1">
                <FaClock className="text-xs" />
                Waiting
              </span>
            )}
            {game.status === 'playing' && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg flex items-center gap-1 animate-pulse">
                <FaBolt className="text-xs" />
                In Progress
              </span>
            )}
            {game.status === 'finished' && (
              <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-lg">
                Finished
              </span>
            )}

            {/* Result Badge */}
            {game.result === 'won' && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-1">
                <FaTrophy className="text-xs" />
                Won {game.prize} SOL
              </span>
            )}
            {game.result === 'lost' && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg flex items-center gap-1">
                <FaTimesCircle className="text-xs" />
                Lost
              </span>
            )}

            {/* Players Info */}
            <span className="px-3 py-1 bg-gray-700/50 text-gray-300 rounded-lg">
              {game.players}/{game.maxPlayers} players
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <Link to={game.type === 'dice-multi' ? '/dice/multi' : '/dice/battle'}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              {game.status === 'waiting' || game.status === 'playing' ? 'View Game' : 'Play Again'}
              <FaArrowRight />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          My <span className="text-gradient">Games</span>
        </h1>
        <p className="text-gray-400 text-lg">
          Track your dice game activity and earnings
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-3 gap-6 mb-12"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.03, y: -4 }}
            className="card-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`${stat.color} text-2xl`} />
              </div>
            </div>
            <h3 className="text-sm text-gray-400 mb-2 uppercase tracking-wide font-medium">{stat.label}</h3>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex gap-2 p-1 bg-gray-900/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-primary-500 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaGamepad className="inline mr-2" />
            Active Games
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-primary-500 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaHistory className="inline mr-2" />
            History
          </button>
        </div>
      </motion.div>

      {/* Games List */}
      <AnimatePresence mode="wait">
        {activeTab === 'active' ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {activeGames.length === 0 ? (
              <div className="card-glass text-center py-16">
                <FaDice className="text-5xl text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Active Games</h3>
                <p className="text-gray-400 mb-6">You're not currently in any games</p>
                <Link to="/dice">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary px-6 py-3"
                  >
                    <FaDice className="inline mr-2" />
                    Play Dice Game
                  </motion.button>
                </Link>
              </div>
            ) : (
              activeGames.map(game => <GameCard key={game.id} game={game} />)
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {historyGames.length === 0 ? (
              <div className="card-glass text-center py-16">
                <FaHistory className="text-5xl text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Game History</h3>
                <p className="text-gray-400">Play some games to build your history!</p>
              </div>
            ) : (
              historyGames.map(game => <GameCard key={game.id} game={game} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Play Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12 card-glass bg-gradient-to-r from-primary-900/20 to-secondary-900/20 border-primary-500/20"
      >
        <div className="p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready for Another Round?</h3>
          <p className="text-gray-400 mb-6">Jump into a quick dice game and test your luck!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dice/battle">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary px-8 py-3"
              >
                <FaUser className="inline mr-2" />
                1v1 Battle
              </motion.button>
            </Link>
            <Link to="/dice/multi">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-secondary px-8 py-3"
              >
                <FaUsers className="inline mr-2" />
                Multiplayer Arena
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MyBetsPage