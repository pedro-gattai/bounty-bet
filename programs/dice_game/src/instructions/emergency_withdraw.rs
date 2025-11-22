use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Waiting @ CustomError::GameStarted,
        constraint = game_account.players.contains(&player.key()) @ CustomError::PlayerNotInGame,
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<EmergencyWithdraw>) -> Result<()> {
    let clock = Clock::get()?;

    // Get necessary data before mutable borrow
    let (expired, player_index, entry_fee) = {
        let game = &ctx.accounts.game_account;
        let expired = clock.unix_timestamp - game.created_at > 86400;
        let player_index = game.players
            .iter()
            .position(|p| p == &ctx.accounts.player.key())
            .ok_or(CustomError::PlayerNotInGame)?;
        (expired, player_index, game.entry_fee)
    };

    // Check if game has expired (24 hours without starting)
    require!(expired, CustomError::NotExpired);

    // Return entry fee to player
    **ctx.accounts.game_account.to_account_info().lamports.borrow_mut() -= entry_fee;
    **ctx.accounts.player.to_account_info().lamports.borrow_mut() += entry_fee;

    // Remove player from game
    let game = &mut ctx.accounts.game_account;
    game.players.remove(player_index);
    game.current_players -= 1;
    game.total_pool -= entry_fee;

    // If no players left, cancel the game
    if game.current_players == 0 {
        game.status = GameStatus::Cancelled;
        game.completed_at = Some(clock.unix_timestamp);
    }

    Ok(())
}

#[error_code]
pub enum CustomError {
    #[msg("Game already started")]
    GameStarted,
    #[msg("Player not in this game")]
    PlayerNotInGame,
    #[msg("Game not expired yet")]
    NotExpired,
}