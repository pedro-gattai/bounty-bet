import { useConnection } from '@solana/wallet-adapter-react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { getProgram } from './anchorProgram'

/**
 * Custom hook for Dice Game methods
 * Follows the Battle-Block pattern for method calls
 */
export function useDiceGame() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  /**
   * Derive the game account PDA
   */
  const getGameAccountPDA = async (gameId: BN): Promise<[PublicKey, number]> => {
    const program = await getProgram(connection, wallet)
    if (!program) throw new Error('Program not initialized')

    return PublicKey.findProgramAddressSync(
      [Buffer.from('game'), gameId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    )
  }

  /**
   * Create a new game
   */
  const createGame = async (
    gameId: BN,
    entryFee: BN,
    maxPlayers: number
  ): Promise<string> => {
    console.log('Creating game with:', {
      gameId: gameId.toString(),
      entryFee: entryFee.toString(),
      maxPlayers
    })

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .createGame(gameId, entryFee, maxPlayers)
        .accounts({
          gameAccount: gameAccount,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Create game transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error creating game:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Join an existing game
   */
  const joinGame = async (gameId: BN): Promise<string> => {
    console.log('Joining game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .joinGame()
        .accounts({
          gameAccount: gameAccount,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Join game transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error joining game:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Start a game (only creator can do this)
   */
  const startGame = async (gameId: BN): Promise<string> => {
    console.log('Starting game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .startGame()
        .accounts({
          gameAccount: gameAccount,
          starter: wallet.publicKey,
        })
        .rpc()

      console.log('Start game transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error starting game:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Roll dice in a game
   */
  const rollDice = async (gameId: BN): Promise<string> => {
    console.log('Rolling dice for game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .rollDice()
        .accounts({
          gameAccount: gameAccount,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Roll dice transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error rolling dice:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Finalize a game
   */
  const finalizeGame = async (gameId: BN): Promise<string> => {
    console.log('Finalizing game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .finalizeGame()
        .accounts({
          gameAccount: gameAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Finalize game transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error finalizing game:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Emergency withdraw from a game
   */
  const emergencyWithdraw = async (gameId: BN): Promise<string> => {
    console.log('Emergency withdraw from game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .emergencyWithdraw()
        .accounts({
          gameAccount: gameAccount,
          player: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Emergency withdraw transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error in emergency withdraw:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Fetch a game account
   */
  const fetchGameAccount = async (gameId: BN) => {
    console.log('Fetching game account:', gameId.toString())

    const program = await getProgram(connection, wallet)
    if (!program) {
      console.log('Program not initialized, cannot fetch account')
      return null
    }

    try {
      const [gameAccount] = await getGameAccountPDA(gameId)
      const accountData = await (program.account as any).gameAccount.fetch(gameAccount)

      console.log('Game account fetched:', {
        gameId: accountData.gameId.toString(),
        status: accountData.status,
        currentPlayers: accountData.currentPlayers,
        maxPlayers: accountData.maxPlayers,
        entryFee: accountData.entryFee.toString(),
        totalPool: accountData.totalPool.toString()
      })

      return accountData
    } catch (error) {
      console.error('Error fetching game account:', error)
      return null
    }
  }

  /**
   * Fetch all games
   */
  const fetchAllGames = async () => {
    console.log('Fetching all games')

    const program = await getProgram(connection, wallet)
    if (!program) {
      console.log('Program not initialized, cannot fetch games')
      return []
    }

    try {
      const games = await (program.account as any).gameAccount.all()
      console.log(`Fetched ${games.length} games`)

      return games.map((game: any) => ({
        publicKey: game.publicKey,
        account: game.account
      }))
    } catch (error) {
      console.error('Error fetching all games:', error)
      return []
    }
  }

  /**
   * Claim prize from a completed game
   */
  const claimPrize = async (gameId: BN): Promise<string> => {
    console.log('Claiming prize for game:', gameId.toString())

    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    const program = await getProgram(connection, wallet)
    if (!program) {
      throw new Error('Program not initialized')
    }

    try {
      // Get the game account PDA
      const [gameAccount] = await getGameAccountPDA(gameId)
      console.log('Game account PDA:', gameAccount.toBase58())

      // Build and send the transaction
      const tx = await program.methods
        .claimPrize()
        .accounts({
          gameAccount: gameAccount,
          winner: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Claim prize transaction successful:', tx)
      return tx
    } catch (error: any) {
      console.error('Error claiming prize:', error)
      console.error('Error details:', {
        message: error?.message,
        logs: error?.logs,
        error: error?.error
      })
      throw error
    }
  }

  /**
   * Check wallet balance with retry logic
   */
  const checkBalance = async (publicKey: PublicKey, retries = 2): Promise<number | null> => {
    for (let i = 0; i <= retries; i++) {
      try {
        const balance = await connection.getBalance(publicKey)
        return balance / LAMPORTS_PER_SOL
      } catch (error) {
        console.error(`Error checking balance (attempt ${i + 1}/${retries + 1}):`, error)

        // If not last retry, wait before trying again
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    // Return null to indicate error (different from 0 balance)
    console.warn('Failed to check balance after all retries')
    return null
  }

  /**
   * Request airdrop (devnet only)
   */
  const requestAirdrop = async (publicKey: PublicKey, amount: number = 1): Promise<string> => {
    try {
      console.log(`Requesting ${amount} SOL airdrop to ${publicKey.toBase58()}`)

      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      )

      // Wait for confirmation
      await connection.confirmTransaction(signature)

      console.log('Airdrop successful:', signature)
      return signature
    } catch (error: any) {
      console.error('Error requesting airdrop:', error)
      throw new Error(error?.message || 'Failed to request airdrop')
    }
  }

  /**
   * Check if the program is initialized
   */
  const isProgramReady = async (): Promise<boolean> => {
    try {
      const program = await getProgram(connection, wallet)
      return program !== null && program.methods !== undefined
    } catch {
      return false
    }
  }

  return {
    createGame,
    joinGame,
    startGame,
    rollDice,
    finalizeGame,
    emergencyWithdraw,
    claimPrize,
    fetchGameAccount,
    fetchAllGames,
    isProgramReady,
    getGameAccountPDA,
    checkBalance,
    requestAirdrop,
  }
}