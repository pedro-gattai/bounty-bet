import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorWallet } from '@solana/wallet-adapter-react'
import diceGameIDL from '../idl/dice_game.json'

// Cache for the IDL to avoid repeated parsing
let cachedIDL: Idl | null = null

// Cache for the program instance
let cachedProgram: Program | null = null
let cachedWallet: string | null = null
let cachedConnection: string | null = null

/**
 * Get the Dice Game IDL
 * Uses cached version if available
 */
export function getDiceGameIDL(): Idl {
  if (!cachedIDL) {
    cachedIDL = diceGameIDL as Idl
    console.log('IDL loaded:', {
      name: cachedIDL.name,
      version: cachedIDL.version,
      address: (cachedIDL as any).address,
      instructionCount: cachedIDL.instructions?.length || 0
    })
  }
  return cachedIDL
}

/**
 * Get the Dice Game program instance
 * This follows the Battle-Block pattern for proper initialization
 *
 * @param connection - Solana connection
 * @param wallet - Anchor wallet from wallet adapter
 * @returns Program instance or null if wallet not connected
 */
export async function getProgram(
  connection: Connection,
  wallet: AnchorWallet | undefined | null
): Promise<Program | null> {
  // If no wallet, return null
  if (!wallet || !wallet.publicKey) {
    console.log('No wallet connected, cannot create program')
    return null
  }

  // Check if we can use cached program
  const walletKey = wallet.publicKey.toBase58()
  const connectionEndpoint = connection.rpcEndpoint

  if (
    cachedProgram &&
    cachedWallet === walletKey &&
    cachedConnection === connectionEndpoint
  ) {
    console.log('Using cached program instance')
    return cachedProgram
  }

  try {
    // Create the provider with correct options
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    )

    // Get the IDL
    const idl = getDiceGameIDL()

    // Add detailed diagnostics
    console.log('=== DETAILED IDL DIAGNOSTICS ===')
    console.log('IDL structure:', {
      name: idl.name,
      version: idl.version,
      address: (idl as any).address,
      hasMetadata: !!(idl as any).metadata,
      accountsCount: idl.accounts?.length || 0,
      accountNames: idl.accounts?.map((a: any) => a.name) || [],
      instructionCount: idl.instructions?.length || 0,
      instructionNames: idl.instructions?.map((i: any) => i.name) || []
    })

    // Try creating program with explicit program ID (3 parameters)
    let program: Program

    try {
      // First attempt: Use explicit program ID
      const programId = new PublicKey((idl as any).address)
      console.log('Attempting with explicit program ID:', programId.toBase58())
      program = new Program(idl, programId, provider)
      console.log('✅ Program created with explicit ID')
    } catch (explicitError) {
      console.log('❌ Explicit ID failed:', explicitError)
      console.log('Falling back to 2-parameter constructor...')

      // Fallback: Let Anchor extract from IDL
      program = new Program(idl, provider)
      console.log('✅ Program created with IDL extraction')
    }

    // Detailed logging of what was created
    console.log('=== PROGRAM CREATION DIAGNOSTICS ===')
    console.log('Program created:', {
      programId: program.programId?.toBase58() || 'undefined',
      hasAccount: !!program.account,
      accountKeys: program.account ? Object.keys(program.account) : [],
      hasMethods: !!program.methods,
      methodKeys: program.methods ? Object.keys(program.methods).slice(0, 5) : [],
      hasRpc: !!program.rpc,
      rpcKeys: program.rpc ? Object.keys(program.rpc).slice(0, 5) : []
    })

    // Log account access attempt
    if (program.account) {
      console.log('Account accessor exists. Keys:', Object.keys(program.account))
      if ('gameAccount' in program.account) {
        console.log('✅ gameAccount found in program.account')
      } else {
        console.log('❌ gameAccount NOT found in program.account')
        console.log('Available accounts:', Object.keys(program.account))
      }
    } else {
      console.log('❌ program.account is undefined!')
    }

    // Verify methods are available
    if (!program.methods) {
      console.error('Program methods not available!')
      throw new Error('Program methods not initialized')
    }

    // Cache the program
    cachedProgram = program
    cachedWallet = walletKey
    cachedConnection = connectionEndpoint

    return program
  } catch (error) {
    console.error('Error creating program:', error)

    // Clear cache on error
    cachedProgram = null
    cachedWallet = null
    cachedConnection = null

    throw error
  }
}

/**
 * Clear the cached program
 * Useful when switching wallets or networks
 */
export function clearProgramCache() {
  cachedProgram = null
  cachedWallet = null
  cachedConnection = null
  console.log('Program cache cleared')
}

/**
 * Get the program ID from the IDL
 */
export function getProgramId(): string {
  const idl = getDiceGameIDL()
  return (idl as any).address || ''
}