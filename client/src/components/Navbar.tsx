import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { motion, AnimatePresence } from 'framer-motion'
import { HiMenu, HiX } from 'react-icons/hi'
import { FaDice } from 'react-icons/fa'

const Navbar = () => {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/dice', label: '🎲 Dice Game' },
    { path: '/my-games', label: 'My Games' },
  ]

  const NavLink = ({ path, label, mobile = false }: { path: string; label: string; mobile?: boolean }) => {
    const active = isActive(path)
    const baseClasses = mobile
      ? "block py-3 px-4 rounded-lg text-lg font-medium"
      : "relative py-2 px-3 rounded-lg font-medium"

    return (
      <Link
        to={path}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={`${baseClasses} transition-all duration-300 ${
          active
            ? 'text-primary-400 bg-primary-500/10'
            : 'text-gray-300 hover:text-primary-400 hover:bg-gray-800/50'
        }`}
      >
        {label}
        {active && !mobile && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 to-secondary-400"
            initial={false}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </Link>
    )
  }

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/40 backdrop-blur-xl border-b border-gray-800/50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              className="relative w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-glow-sm group-hover:shadow-glow transition-shadow duration-300"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <FaDice className="text-white text-xl" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 via-secondary-400 to-primary-400 bg-clip-text text-transparent">
                Dice Vault
              </span>
              <span className="text-xs text-gray-500 font-medium -mt-1">Gaming on Solana</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {navLinks.map((link) => (
              <NavLink key={link.path} {...link} />
            ))}
          </div>

          {/* Wallet Button & Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <WalletMultiButton className="!bg-gradient-to-r !from-primary-500 !to-primary-600 hover:!from-primary-400 hover:!to-primary-500 !rounded-lg !font-semibold !transition-all !duration-300 !shadow-glow-sm hover:!shadow-glow" />
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-primary-400 hover:bg-gray-800/50 transition-all duration-300"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <HiX className="w-6 h-6" />
              ) : (
                <HiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden border-t border-gray-800/50 bg-gray-900/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <NavLink key={link.path} {...link} mobile />
              ))}
              <div className="pt-4 border-t border-gray-800/50">
                <WalletMultiButton className="!w-full !bg-gradient-to-r !from-primary-500 !to-primary-600 hover:!from-primary-400 hover:!to-primary-500 !rounded-lg !font-semibold !transition-all !duration-300 !shadow-glow-sm hover:!shadow-glow" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar