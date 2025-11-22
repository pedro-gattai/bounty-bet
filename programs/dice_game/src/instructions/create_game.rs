use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(game_id: u64, entry_fee: u64, max_players: u8)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = GameAccount::space(),
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGame>, game_id: u64, entry_fee: u64, max_players: u8) -> Result<()> {
    require!(max_players >= 2 && max_players <= 6, CustomError::InvalidMaxPlayers);
    require!(entry_fee > 0, CustomError::InvalidEntryFee);

    let game = &mut ctx.accounts.game_account;
    let clock = Clock::get()?;

    game.game_id = game_id;
    game.creator = ctx.accounts.creator.key();
    game.entry_fee = entry_fee;
    game.max_players = max_players;
    game.current_players = 1;
    game.total_pool = entry_fee;
    game.status = GameStatus::Waiting;
    game.created_at = clock.unix_timestamp;
    game.started_at = None;
    game.completed_at = None;
    game.players = vec![ctx.accounts.creator.key()];
    game.rolls = vec![None; max_players as usize];
    game.winner = None;
    game.prize_claimed = false;

    // Transfer entry fee from creator to game account
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.game_account.to_account_info(),
            }
        ),
        entry_fee
    )?;

    emit!(GameCreated {
        game_id,
        creator: ctx.accounts.creator.key(),
        entry_fee,
        max_players,
    });

    Ok(())
}

#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_players: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("Invalid max players (must be 2-6)")]
    InvalidMaxPlayers,
    #[msg("Invalid entry fee")]
    InvalidEntryFee,
}