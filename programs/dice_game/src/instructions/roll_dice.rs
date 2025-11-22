use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct RollDice<'info> {
    #[account(
        mut,
        constraint = game_account.status == GameStatus::Playing @ CustomError::GameNotPlaying,
        constraint = game_account.players.contains(&player.key()) @ CustomError::PlayerNotInGame,
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RollDice>) -> Result<()> {
    let game = &mut ctx.accounts.game_account;
    let clock = Clock::get()?;

    // Find player index
    let player_index = game.players
        .iter()
        .position(|p| p == &ctx.accounts.player.key())
        .ok_or(CustomError::PlayerNotInGame)?;

    // Check if player already rolled
    require!(game.rolls[player_index].is_none(), CustomError::AlreadyRolled);

    // Generate pseudo-random dice roll
    // In production, you'd want to use a VRF for true randomness
    let slot = clock.slot;
    let dice1 = ((slot % 6) + 1) as u8;
    let dice2 = (((slot >> 8) % 6) + 1) as u8;
    let total = dice1 + dice2;

    // Record the roll
    game.rolls[player_index] = Some(DiceRoll {
        dice1,
        dice2,
        total,
        rolled_at: clock.unix_timestamp,
    });

    emit!(DiceRolled {
        game_id: game.game_id,
        player: ctx.accounts.player.key(),
        dice1,
        dice2,
        total,
    });

    // Check if all players have rolled
    let all_rolled = game.players
        .iter()
        .enumerate()
        .take(game.current_players as usize)
        .all(|(i, _)| game.rolls[i].is_some());

    if all_rolled {
        // Find winner (highest roll)
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

        // Calculate prize (minus 2.5% fee)
        let fee = game.total_pool * 25 / 1000; // 2.5%
        let prize = game.total_pool - fee;

        // Note: Prize transfer happens in a separate claim_prize instruction
        // where the winner provides their account as a signer
        // GameCompleted event is emitted in finalize_game or claim_prize
    }

    Ok(())
}

#[event]
pub struct DiceRolled {
    pub game_id: u64,
    pub player: Pubkey,
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
}

// GameCompleted event moved to finalize_game.rs to avoid duplication

#[error_code]
pub enum CustomError {
    #[msg("Game is not in playing state")]
    GameNotPlaying,
    #[msg("Player not in this game")]
    PlayerNotInGame,
    #[msg("Player already rolled dice")]
    AlreadyRolled,
}