use anchor_lang::prelude::*;
use crate::state::*;
use crate::instructions::start_game::GameStarted;

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Waiting @ CustomError::GameNotWaiting,
        constraint = game_account.current_players < game_account.max_players @ CustomError::GameFull,
        constraint = !game_account.players.contains(&player.key()) @ CustomError::AlreadyJoined,
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinGame>) -> Result<()> {
    // Get entry fee before borrowing game mutably
    let entry_fee = ctx.accounts.game_account.entry_fee;

    // Transfer entry fee from player to game account
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.game_account.to_account_info(),
            }
        ),
        entry_fee
    )?;

    let game = &mut ctx.accounts.game_account;

    // Add player to the game
    game.players.push(ctx.accounts.player.key());
    game.current_players += 1;
    game.total_pool += entry_fee;

    emit!(PlayerJoined {
        game_id: game.game_id,
        player: ctx.accounts.player.key(),
        current_players: game.current_players,
    });

    // Auto-start if max players reached
    if game.current_players == game.max_players {
        let clock = Clock::get()?;
        game.status = GameStatus::Playing;
        game.started_at = Some(clock.unix_timestamp);

        emit!(GameStarted {
            game_id: game.game_id,
            players_count: game.current_players,
        });
    }

    Ok(())
}

#[event]
pub struct PlayerJoined {
    pub game_id: u64,
    pub player: Pubkey,
    pub current_players: u8,
}

// GameStarted event defined in start_game.rs

#[error_code]
pub enum CustomError {
    #[msg("Game is full")]
    GameFull,
    #[msg("Game is not waiting for players")]
    GameNotWaiting,
    #[msg("Player already joined this game")]
    AlreadyJoined,
}