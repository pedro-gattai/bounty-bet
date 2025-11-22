pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("42kX7N73TVX16fufFaEaN2nfev4zDTa5TbvdAqXYKPd3");

#[program]
pub mod dice_game {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: u64,
        entry_fee: u64,
        max_players: u8,
    ) -> Result<()> {
        create_game::handler(ctx, game_id, entry_fee, max_players)
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        join_game::handler(ctx)
    }

    pub fn start_game(ctx: Context<StartGame>) -> Result<()> {
        start_game::handler(ctx)
    }

    pub fn roll_dice(ctx: Context<RollDice>) -> Result<()> {
        roll_dice::handler(ctx)
    }

    pub fn finalize_game(ctx: Context<FinalizeGame>) -> Result<()> {
        finalize_game::handler(ctx)
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        emergency_withdraw::handler(ctx)
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        claim_prize::handler(ctx)
    }
}
