use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct FinalizeGame<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Playing @ CustomError::GameNotPlaying,
    )]
    pub game_account: Account<'info, GameAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FinalizeGame>) -> Result<()> {
    let game = &mut ctx.accounts.game_account;
    let clock = Clock::get()?;

    // Check if all players have rolled
    let all_rolled = game.players
        .iter()
        .enumerate()
        .take(game.current_players as usize)
        .all(|(i, _)| game.rolls[i].is_some());

    require!(all_rolled, CustomError::WaitingForRolls);

    // Find winner
    let mut winner_index = 0;
    let mut highest_roll = 0u8;

    for (i, roll_opt) in game.rolls.iter().enumerate().take(game.current_players as usize) {
        if let Some(roll) = roll_opt {
            if roll.total > highest_roll {
                highest_roll = roll.total;
                winner_index = i;
            }
        }
    }

    game.winner = Some(game.players[winner_index]);
    game.status = GameStatus::Completed;
    game.completed_at = Some(clock.unix_timestamp);

    // Calculate and transfer prize
    let fee = game.total_pool * 25 / 1000; // 2.5% fee
    let prize = game.total_pool - fee;

    emit!(GameCompleted {
        game_id: game.game_id,
        winner: game.players[winner_index],
        prize_amount: prize,
        winner_roll: highest_roll,
    });

    Ok(())
}

#[event]
pub struct GameCompleted {
    pub game_id: u64,
    pub winner: Pubkey,
    pub prize_amount: u64,
    pub winner_roll: u8,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not in playing state")]
    GameNotPlaying,
    #[msg("Waiting for all players to roll")]
    WaitingForRolls,
}