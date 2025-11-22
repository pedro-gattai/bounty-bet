use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum GameStatus {
    Waiting,
    Playing,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct DiceRoll {
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub rolled_at: i64,
}

#[account]
pub struct GameAccount {
    pub game_id: u64,
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_players: u8,
    pub current_players: u8,
    pub total_pool: u64,
    pub status: GameStatus,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub players: Vec<Pubkey>,
    pub rolls: Vec<Option<DiceRoll>>,
    pub winner: Option<Pubkey>,
    pub prize_claimed: bool,
}

impl GameAccount {
    pub const MAX_PLAYERS: usize = 6;

    // Calculate the size of the account
    pub fn space() -> usize {
        8 + // discriminator
        8 + // game_id
        32 + // creator
        8 + // entry_fee
        1 + // max_players
        1 + // current_players
        8 + // total_pool
        1 + // status enum
        8 + // created_at
        1 + 8 + // started_at Option
        1 + 8 + // completed_at Option
        4 + (32 * Self::MAX_PLAYERS) + // players Vec
        4 + (Self::MAX_PLAYERS * (1 + 20)) + // rolls Vec with Option<DiceRoll>
        1 + 32 + // winner Option<Pubkey>
        1 // prize_claimed bool
    }
}