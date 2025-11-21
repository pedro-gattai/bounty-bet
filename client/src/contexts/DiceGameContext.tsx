import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import diceGameIDL from '../../../target/idl/dice_game.json'

const DICE_GAME_PROGRAM_ID = new PublicKey('6TMNF6Wrw7PCBbRgJUJSzQBn8g43XZ4Y28pSFGRX5jER')

interface DiceGameContextType {
  program: Program | null
  connection: Connection | null
  loading: boolean
  error: string | null
}

const DiceGameContext = createContext<DiceGameContextType>({
  program: null,
  connection: null,
  loading: true,
  error: null,
})

export const useDiceGame = () => {
  const context = useContext(DiceGameContext)
  if (!context) {
    throw new Error('useDiceGame must be used within a DiceGameProvider')
  }
  return context
}

interface DiceGameProviderProps {
  children: ReactNode
}

export const DiceGameProvider = ({ children }: DiceGameProviderProps) => {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initProgram = async () => {
      if (!wallet || !connection) {
        setProgram(null)
        setLoading(false)
        return
      }

      try {
        const provider = new AnchorProvider(
          connection,
          wallet,
          { commitment: 'confirmed' }
        )

        const program = new Program(
          diceGameIDL as any,
          DICE_GAME_PROGRAM_ID,
          provider
        )

        setProgram(program)
        setError(null)
      } catch (err) {
        console.error('Error initializing dice game program:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setProgram(null)
      } finally {
        setLoading(false)
      }
    }

    initProgram()
  }, [connection, wallet])

  return (
    <DiceGameContext.Provider value={{ program, connection, loading, error }}>
      {children}
    </DiceGameContext.Provider>
  )
}

// Helper functions for dice game operations
export const createDiceGame = async (
  program: Program,
  creator: PublicKey,
  gameId: BN,
  entryFee: BN,
  maxPlayers: number
) => {
  const [gameAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('dice_game'), gameId.toArrayLike(Buffer, 'le', 8)],
    program.programId
  )

  const tx = await program.methods
    .createGame(gameId, entryFee, maxPlayers)
    .accounts({
      gameAccount,
      creator,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return { tx, gameAccount }
}

export const joinDiceGame = async (
  program: Program,
  gameAccount: PublicKey,
  player: PublicKey
) => {
  const tx = await program.methods
    .joinGame()
    .accounts({
      gameAccount,
      player,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return tx
}

export const rollDice = async (
  program: Program,
  gameAccount: PublicKey,
  player: PublicKey
) => {
  const tx = await program.methods
    .rollDice()
    .accounts({
      gameAccount,
      player,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc()

  return tx
}

export const fetchGameAccount = async (
  program: Program,
  gameAccount: PublicKey
) => {
  try {
    const game = await program.account.gameAccount.fetch(gameAccount)
    return game
  } catch (error) {
    console.error('Error fetching game account:', error)
    return null
  }
}