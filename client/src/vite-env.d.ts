/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_NETWORK?: string
  readonly VITE_RPC_ENDPOINT?: string
  readonly VITE_DICE_GAME_PROGRAM_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
