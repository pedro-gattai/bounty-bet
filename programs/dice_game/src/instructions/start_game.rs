use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Waiting @ CustomError::GameNotWaiting,
        constraint = game_account.creator == starter.key() @ CustomError::NotCreator,
        constraint = game_account.current_players >= 2 @ CustomError::NotEnoughPlayers,
    )]
    pub game_account: Account<'info, GameAccount>,

    pub starter: Signer<'info>,
}

pub fn handler(ctx: Context<StartGame>) -> Result<()> {
    let game = &mut ctx.accounts.game_account;
    let clock = Clock::get()?;

    game.status = GameStatus::Playing;
    game.started_at = Some(clock.unix_timestamp);

    emit!(GameStarted {
        game_id: game.game_id,
        players_count: game.current_players,
    });

    Ok(())
}

#[event]
pub struct GameStarted {
    pub game_id: u64,
    pub players_count: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not waiting for players")]
    GameNotWaiting,
    #[msg("Only creator can start the game")]
    NotCreator,
    #[msg("Not enough players to start")]
    NotEnoughPlayers,
}