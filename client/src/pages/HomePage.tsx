import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import {
  FaLock,
  FaShieldAlt,
  FaBolt,
  FaUsers,
  FaTrophy,
  FaRocket,
  FaChartLine,
  FaCheckCircle,
  FaDice
} from 'react-icons/fa'

const HomePage = () => {
  const { connected } = useWallet()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  }

  const features = [
    {
      icon: FaDice,
      title: "Provably Fair",
      description: "On-chain random number generation ensures completely fair dice rolls",
      color: "primary"
    },
    {
      icon: FaBolt,
      title: "Instant Payouts",
      description: "Winners receive SOL automatically - no waiting, no intermediaries",
      color: "secondary"
    },
    {
      icon: FaUsers,
      title: "Multiplayer Action",
      description: "Play 1v1 battles or compete with up to 6 players in one game",
      color: "primary"
    }
  ]

  const gameModes = [
    {
      icon: FaDice,
      title: "1v1 Battle Mode",
      description: "Head-to-head dice battles. Lock your SOL, highest roll wins all!",
      gradient: "from-primary-900/50 to-primary-800/30",
      border: "border-primary-700/50",
      iconBg: "bg-primary-500",
      link: "/dice?mode=1v1"
    },
    {
      icon: FaTrophy,
      title: "Multiplayer Mayhem",
      description: "Up to 6 players compete. Only one winner takes the entire pot!",
      gradient: "from-secondary-900/50 to-secondary-800/30",
      border: "border-secondary-700/50",
      iconBg: "bg-secondary-500",
      link: "/dice?mode=multiplayer"
    },
    {
      icon: FaRocket,
      title: "Quick Play",
      description: "Jump into any available game instantly. Fast-paced action!",
      gradient: "from-purple-900/50 to-purple-800/30",
      border: "border-purple-700/50",
      iconBg: "bg-purple-500",
      link: "/dice"
    }
  ]

  const stats = [
    { label: "Total Volume", value: "0 SOL", color: "text-primary-400", icon: FaChartLine },
    { label: "Active Bets", value: "0", color: "text-secondary-400", icon: FaBolt },
    { label: "Completed Bets", value: "0", color: "text-green-400", icon: FaCheckCircle },
    { label: "Total Users", value: "0", color: "text-purple-400", icon: FaUsers }
  ]

  return (
    <div className="relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-300" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section */}
        <motion.div
          className="text-center pt-20 pb-16 md:pt-32 md:pb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full text-primary-400 text-sm font-medium">
              <FaRocket className="animate-bounce" />
              <span>Built on Solana for Lightning-Fast Transactions</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="text-gradient">
              Roll the Dice
            </span>
            <br />
            <span className="text-white">Win Big on Solana</span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            The ultimate dice game experience on Solana blockchain.
            <br className="hidden md:block" />
            Instant payouts. Provably fair. Join the action now!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {connected ? (
              <div className="flex flex-col items-center gap-6">
                {/* Featured Dice Game Button */}
                <Link to="/dice" className="w-full max-w-lg">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 p-1 shadow-glow"
                  >
                    <div className="bg-gray-900 rounded-xl px-8 py-8 text-center">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <FaDice className="text-5xl text-primary-400 animate-bounce" />
                        <span className="text-3xl font-bold text-gradient">Play Dice Game!</span>
                      </div>
                      <p className="text-gray-400 text-base mb-4">
                        Roll the dice, lock your SOL, winner takes all!
                      </p>
                      <div className="flex justify-center gap-8 text-sm">
                        <div>
                          <span className="text-primary-400 font-bold">1v1 Battle</span>
                          <p className="text-gray-500">Head-to-head</p>
                        </div>
                        <div className="text-gray-600">|</div>
                        <div>
                          <span className="text-secondary-400 font-bold">Multiplayer</span>
                          <p className="text-gray-500">Up to 6 players</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                {/* Quick Links */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/my-games">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-secondary px-10 py-4 text-lg w-full sm:w-auto"
                    >
                      My Games
                    </motion.button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="card-glass max-w-md mx-auto p-8">
                <FaRocket className="text-4xl text-primary-400 mx-auto mb-4 animate-float" />
                <p className="text-lg mb-2 font-semibold">Connect your wallet to get started</p>
                <p className="text-gray-400">Use the button in the top right corner</p>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="py-16 md:py-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            variants={itemVariants}
          >
            Why Play <span className="text-gradient-green">Dice Game</span>?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="card-glow group"
              >
                <div className={`w-14 h-14 bg-${feature.color}-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                </div>
                <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Game Modes Section */}
        <motion.div
          className="py-16 md:py-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            variants={itemVariants}
          >
            <span className="text-gradient-purple">Choose Your</span> Game Mode
          </motion.h2>
          <motion.p
            className="text-gray-400 text-center mb-16 text-lg"
            variants={itemVariants}
          >
            Multiple ways to play, multiple ways to win!
          </motion.p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameModes.map((mode, index) => (
              <Link key={index} to={mode.link}>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.03 }}
                  className={`bg-gradient-to-br ${mode.gradient} border ${mode.border} rounded-2xl p-8 hover:shadow-glow-sm transition-all duration-300 cursor-pointer h-full`}
                >
                  <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 ${mode.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                      <mode.icon className="text-white text-xl" />
                    </div>
                    <h3 className="text-xl font-semibold ml-4">{mode.title}</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    {mode.description}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="py-16 md:py-24 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            className="card-glass p-8 md:p-12"
            variants={itemVariants}
          >
            <h2 className="text-3xl font-bold mb-8 text-center md:text-left">
              Platform <span className="text-gradient">Statistics</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  className="text-center md:text-left"
                >
                  <div className="flex items-center justify-center md:justify-start mb-3">
                    <stat.icon className={`${stat.color} text-2xl mr-2`} />
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                      {stat.label}
                    </p>
                  </div>
                  <p className={`text-4xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default HomePage