import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Program } from '@coral-xyz/anchor'
import { Connection } from '@solana/web3.js'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { getProgram, clearProgramCache } from '../lib/anchorProgram'

interface DiceGameContextType {
  program: Program | null
  connection: Connection
  loading: boolean
  error: string | null
  refreshProgram: () => Promise<void>
}

const DiceGameContext = createContext<DiceGameContextType | undefined>(undefined)

export const useDiceGameContext = () => {
  const context = useContext(DiceGameContext)
  if (!context) {
    throw new Error('useDiceGameContext must be used within a DiceGameProvider')
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

  const initProgram = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Initializing program with wallet:', wallet?.publicKey?.toBase58() || 'no wallet')

      const prog = await getProgram(connection, wallet)

      if (prog) {
        console.log('Program initialized successfully:', {
          programId: prog.programId.toBase58(),
          hasWallet: !!wallet,
          hasMethods: !!prog.methods,
          methodCount: prog.methods ? Object.keys(prog.methods).length : 0
        })
        setProgram(prog)
      } else {
        console.log('Program initialization returned null (wallet likely not connected)')
        setProgram(null)
      }
    } catch (err) {
      console.error('Error initializing dice game program:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setProgram(null)
    } finally {
      setLoading(false)
    }
  }

  // Initialize program when wallet or connection changes
  useEffect(() => {
    initProgram()
  }, [connection, wallet])

  // Clear cache when wallet changes
  useEffect(() => {
    if (!wallet) {
      clearProgramCache()
    }
  }, [wallet])

  const refreshProgram = async () => {
    clearProgramCache()
    await initProgram()
  }

  return (
    <DiceGameContext.Provider
      value={{
        program,
        connection,
        loading,
        error,
        refreshProgram
      }}
    >
      {children}
    </DiceGameContext.Provider>
  )
}