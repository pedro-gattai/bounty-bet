use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Completed @ CustomError::GameNotCompleted,
        constraint = game_account.winner == Some(winner.key()) @ CustomError::NotWinner,
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimPrize>) -> Result<()> {
    // Check if prize already claimed
    require!(!ctx.accounts.game_account.prize_claimed, CustomError::PrizeAlreadyClaimed);

    // Calculate prize (minus 2.5% fee)
    let total_pool = ctx.accounts.game_account.total_pool;
    let fee = total_pool * 25 / 1000; // 2.5%
    let prize = total_pool - fee;

    // Transfer prize from game account to winner
    **ctx.accounts.game_account.to_account_info().lamports.borrow_mut() -= prize;
    **ctx.accounts.winner.to_account_info().lamports.borrow_mut() += prize;

    // Get game_id before mutably borrowing
    let game_id = ctx.accounts.game_account.game_id;

    // Mark prize as claimed
    let game = &mut ctx.accounts.game_account;
    game.prize_claimed = true;

    emit!(PrizeClaimed {
        game_id,
        winner: ctx.accounts.winner.key(),
        prize_amount: prize,
    });

    Ok(())
}

#[event]
pub struct PrizeClaimed {
    pub game_id: u64,
    pub winner: Pubkey,
    pub prize_amount: u64,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not completed")]
    GameNotCompleted,
    #[msg("You are not the winner")]
    NotWinner,
    #[msg("Prize already claimed")]
    PrizeAlreadyClaimed,
}