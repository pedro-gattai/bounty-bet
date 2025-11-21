import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaDice, FaUser, FaUsers, FaTrophy, FaClock, FaCoins } from 'react-icons/fa'

const DiceModeSelectorPage = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="text-5xl font-bold mb-4">
          <FaDice className="inline-block mr-4 text-primary-400 animate-bounce" />
          Dice Game
        </h1>
        <p className="text-gray-400 text-lg">
          Choose your battle mode and roll the dice!
        </p>
      </motion.div>

      {/* Mode Selection Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* 1v1 Mode */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link to="/dice/battle">
            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="card-glass border-2 border-primary-500/30 hover:border-primary-500/60 transition-all duration-300 h-full"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center">
                    <FaUser className="text-3xl text-primary-400" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">MODE</span>
                    <div className="text-2xl font-bold text-primary-400">1v1</div>
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-4">Battle Mode</h2>
                <p className="text-gray-400 mb-6">
                  Challenge another player in a head-to-head dice duel. Winner takes all!
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <FaTrophy className="text-primary-400" />
                    <span>Direct 1-on-1 competition</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FaCoins className="text-yellow-400" />
                    <span>Equal stakes required</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FaClock className="text-blue-400" />
                    <span>Quick matches</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Players</span>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <FaUser className="text-xs text-primary-400" />
                      </div>
                      <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-500">
                        VS
                      </div>
                      <div className="w-8 h-8 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                        <FaUser className="text-xs text-secondary-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  className="mt-6 text-center py-3 rounded-xl bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-primary-400 font-semibold">PLAY 1v1 →</span>
                </motion.div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Multiplayer Mode */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/dice/multi">
            <motion.div
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="card-glass border-2 border-secondary-500/30 hover:border-secondary-500/60 transition-all duration-300 h-full relative overflow-hidden"
            >
              {/* Live indicator */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-400 font-semibold">LIVE</span>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-secondary-500/20 rounded-2xl flex items-center justify-center">
                    <FaUsers className="text-3xl text-secondary-400" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">MODE</span>
                    <div className="text-2xl font-bold text-secondary-400">MULTI</div>
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-4">
                  Multiplayer Arena
                </h2>
                <p className="text-gray-400 mb-6">
                  Join the global arena! Up to 6 players compete for the massive prize pool.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <FaUsers className="text-secondary-400" />
                    <span>2-6 players per game</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FaClock className="text-yellow-400" />
                    <span>5-minute rounds</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <FaTrophy className="text-green-400" />
                    <span>Winner takes all!</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Current Players</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                          <FaUser className="text-xs text-secondary-400" />
                        </div>
                      ))}
                      {[4, 5, 6].map(i => (
                        <div key={i} className="w-8 h-8 bg-gray-700/50 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-600">?</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.div
                  className="mt-6 text-center py-3 rounded-xl bg-gradient-to-r from-secondary-500/20 to-secondary-600/20 border border-secondary-500/30"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-secondary-400 font-semibold">JOIN ARENA →</span>
                </motion.div>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-12 card-glass bg-gradient-to-r from-primary-900/20 to-secondary-900/20 border-primary-500/20"
      >
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaDice className="text-primary-400" />
            How Dice Games Work
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <div className="font-semibold text-primary-400 mb-1">1. Join & Deposit</div>
              <p>Choose your mode and deposit SOL into the smart contract escrow</p>
            </div>
            <div>
              <div className="font-semibold text-secondary-400 mb-1">2. Roll the Dice</div>
              <p>When game starts, all players roll dice simultaneously</p>
            </div>
            <div>
              <div className="font-semibold text-green-400 mb-1">3. Win & Withdraw</div>
              <p>Highest roll wins the entire prize pool automatically</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default DiceModeSelectorPage