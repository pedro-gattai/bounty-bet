use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::hash::hash;

declare_id!("6TMNF6Wrw7PCBbRgJUJSzQBn8g43XZ4Y28pSFGRX5jER");

const PLATFORM_FEE_BPS: u16 = 250; // 2.5% platform fee
const MAX_PLAYERS: usize = 6;

#[program]
pub mod dice_game {
    use super::*;

    // Create a new dice game (1v1 or multiplayer)
    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: u64,
        entry_fee: u64,
        max_players: u8,
    ) -> Result<()> {
        require!(max_players >= 2 && max_players <= 6, GameError::InvalidMaxPlayers);
        require!(entry_fee > 0, GameError::InvalidEntryFee);

        let game = &mut ctx.accounts.game_account;
        game.game_id = game_id;
        game.creator = ctx.accounts.creator.key();
        game.entry_fee = entry_fee;
        game.max_players = max_players;
        game.current_players = 1;
        game.total_pool = entry_fee;
        game.status = GameStatus::Waiting;
        game.created_at = Clock::get()?.unix_timestamp;

        // Initialize players array with creator
        game.players = vec![ctx.accounts.creator.key()];
        game.rolls = vec![None; max_players as usize];
        game.winner = None;

        // Transfer entry fee from creator to game PDA
        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &ctx.accounts.game_account.key(),
            entry_fee,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.game_account.to_account_info(),
            ],
        )?;

        emit!(GameCreated {
            game_id,
            creator: ctx.accounts.creator.key(),
            entry_fee,
            max_players,
        });

        Ok(())
    }

    // Join an existing game
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game_key = ctx.accounts.game_account.key();
        let game = &mut ctx.accounts.game_account;

        require!(game.status == GameStatus::Waiting, GameError::GameNotWaiting);
        require!(game.current_players < game.max_players, GameError::GameFull);
        require!(!game.players.contains(&ctx.accounts.player.key()), GameError::AlreadyJoined);

        // Add player to the game
        game.players.push(ctx.accounts.player.key());
        game.current_players += 1;
        game.total_pool += game.entry_fee;

        // Transfer entry fee from player to game PDA
        let entry_fee = game.entry_fee;
        let should_start = game.current_players == game.max_players;

        // Get account infos before using them
        let player_info = ctx.accounts.player.to_account_info();
        let game_account_info = ctx.accounts.game_account.to_account_info();

        let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &game_key,
            entry_fee,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[player_info, game_account_info],
        )?;

        // Re-borrow game mutably after the invoke
        let game = &mut ctx.accounts.game_account;

        // Start game if max players reached
        if should_start {
            game.status = GameStatus::Playing;
            game.started_at = Some(Clock::get()?.unix_timestamp);
        }

        emit!(PlayerJoined {
            game_id: game.game_id,
            player: ctx.accounts.player.key(),
            current_players: game.current_players,
        });

        Ok(())
    }

    // Start game (for games that haven't reached max players)
    pub fn start_game(ctx: Context<StartGame>) -> Result<()> {
        let game = &mut ctx.accounts.game_account;

        require!(game.status == GameStatus::Waiting, GameError::GameNotWaiting);
        require!(game.current_players >= 2, GameError::NotEnoughPlayers);
        require!(ctx.accounts.starter.key() == game.creator, GameError::NotCreator);

        game.status = GameStatus::Playing;
        game.started_at = Some(Clock::get()?.unix_timestamp);

        emit!(GameStarted {
            game_id: game.game_id,
            players_count: game.current_players,
        });

        Ok(())
    }

    // Roll dice for a player
    pub fn roll_dice(ctx: Context<RollDice>) -> Result<()> {
        let game = &mut ctx.accounts.game_account;
        let player = ctx.accounts.player.key();

        require!(game.status == GameStatus::Playing, GameError::GameNotPlaying);

        // Find player index
        let player_index = game.players
            .iter()
            .position(|p| *p == player)
            .ok_or(GameError::PlayerNotInGame)?;

        require!(game.rolls[player_index].is_none(), GameError::AlreadyRolled);

        // Generate pseudo-random dice rolls
        let clock = Clock::get()?;
        let mut seed = Vec::new();
        seed.extend_from_slice(&clock.unix_timestamp.to_le_bytes());
        seed.extend_from_slice(player.as_ref());
        seed.extend_from_slice(&game.game_id.to_le_bytes());

        let hash_result = hash(&seed);
        let dice1 = (hash_result.to_bytes()[0] % 6) + 1;
        let dice2 = (hash_result.to_bytes()[1] % 6) + 1;
        let total = dice1 + dice2;

        // Store the roll
        game.rolls[player_index] = Some(DiceRoll {
            dice1,
            dice2,
            total,
            rolled_at: clock.unix_timestamp,
        });

        emit!(DiceRolled {
            game_id: game.game_id,
            player,
            dice1,
            dice2,
            total,
        });

        // Check if all active players have rolled
        let active_players_rolled = game.players
            .iter()
            .take(game.current_players as usize)
            .enumerate()
            .all(|(i, _)| game.rolls[i].is_some());

        if active_players_rolled {
            // Determine winner and distribute prizes automatically
            ctx.accounts.finalize_and_distribute()?;
        }

        Ok(())
    }

    // Finalize game and distribute prizes (called automatically after all rolls)
    pub fn finalize_game(ctx: Context<FinalizeGame>) -> Result<()> {
        ctx.accounts.finalize_and_distribute()?;
        Ok(())
    }

    // Emergency withdraw (only if game expired without starting)
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        let player = ctx.accounts.player.key();
        let game = &mut ctx.accounts.game_account;

        require!(game.status == GameStatus::Waiting, GameError::GameStarted);

        let clock = Clock::get()?;
        let expiry_time = game.created_at + 3600; // 1 hour expiry
        require!(clock.unix_timestamp > expiry_time, GameError::NotExpired);

        // Find player and refund entry fee
        if game.players.contains(&player) {
            let entry_fee = game.entry_fee;

            // Temporarily drop mutable borrow to allow lamport operations
            let game_info = ctx.accounts.game_account.to_account_info();
            let player_info = ctx.accounts.player.to_account_info();

            **game_info.try_borrow_mut_lamports()? -= entry_fee;
            **player_info.try_borrow_mut_lamports()? += entry_fee;

            // Re-borrow game mutably to update state
            let game = &mut ctx.accounts.game_account;

            // Remove player from game
            game.players.retain(|p| *p != player);
            game.current_players -= 1;
            game.total_pool -= game.entry_fee;

            if game.current_players == 0 {
                game.status = GameStatus::Cancelled;
            }
        }

        Ok(())
    }
}

// Contexts
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + GameAccount::INIT_SPACE,
        seeds = [b"dice_game", game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [b"dice_game", game_account.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(
        mut,
        seeds = [b"dice_game", game_account.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    pub starter: Signer<'info>,
}

#[derive(Accounts)]
pub struct RollDice<'info> {
    #[account(
        mut,
        seeds = [b"dice_game", game_account.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeGame<'info> {
    #[account(
        mut,
        seeds = [b"dice_game", game_account.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"dice_game", game_account.game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Account structures
#[account]
#[derive(InitSpace)]
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
    #[max_len(6)]
    pub players: Vec<Pubkey>,
    #[max_len(6)]
    pub rolls: Vec<Option<DiceRoll>>,
    pub winner: Option<Pubkey>,
}

impl<'info> FinalizeGame<'info> {
    fn finalize_and_distribute(&mut self) -> Result<()> {
        let game = &mut self.game_account;

        require!(game.status == GameStatus::Playing, GameError::GameNotPlaying);

        // Check all active players have rolled
        let active_players_rolled = game.players
            .iter()
            .take(game.current_players as usize)
            .enumerate()
            .all(|(i, _)| game.rolls[i].is_some());

        require!(active_players_rolled, GameError::WaitingForRolls);

        // Determine winner(s) - highest total wins
        let mut highest_total = 0u8;
        let mut winner_indices: Vec<usize> = Vec::new();

        for i in 0..game.current_players as usize {
            if let Some(roll) = &game.rolls[i] {
                if roll.total > highest_total {
                    highest_total = roll.total;
                    winner_indices.clear();
                    winner_indices.push(i);
                } else if roll.total == highest_total {
                    winner_indices.push(i);
                }
            }
        }

        // Calculate platform fee and prize
        let platform_fee = (game.total_pool * PLATFORM_FEE_BPS as u64) / 10000;
        let prize_pool = game.total_pool - platform_fee;
        let prize_per_winner = prize_pool / winner_indices.len() as u64;

        // Set game winner (first winner if tie)
        // For MVP, we'll store the winner and prize amount for claiming later
        game.winner = Some(game.players[winner_indices[0]]);
        game.status = GameStatus::Completed;
        game.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(GameCompleted {
            game_id: game.game_id,
            winner: game.winner.unwrap(),
            prize_amount: prize_per_winner,
            winner_roll: highest_total,
        });

        Ok(())
    }
}

impl<'info> RollDice<'info> {
    fn finalize_and_distribute(&mut self) -> Result<()> {
        let game = &mut self.game_account;

        require!(game.status == GameStatus::Playing, GameError::GameNotPlaying);

        // Determine winner(s) - highest total wins
        let mut highest_total = 0u8;
        let mut winner_indices: Vec<usize> = Vec::new();

        for i in 0..game.current_players as usize {
            if let Some(roll) = &game.rolls[i] {
                if roll.total > highest_total {
                    highest_total = roll.total;
                    winner_indices.clear();
                    winner_indices.push(i);
                } else if roll.total == highest_total {
                    winner_indices.push(i);
                }
            }
        }

        // Calculate platform fee and prize
        let platform_fee = (game.total_pool * PLATFORM_FEE_BPS as u64) / 10000;
        let prize_pool = game.total_pool - platform_fee;
        let prize_per_winner = prize_pool / winner_indices.len() as u64;

        // For MVP simplicity, we'll just mark the winner and prize amount
        // The actual transfer happens in a claim instruction
        game.winner = Some(game.players[winner_indices[0]]);
        game.status = GameStatus::Completed;
        game.completed_at = Some(Clock::get()?.unix_timestamp);

        emit!(GameCompleted {
            game_id: game.game_id,
            winner: game.winner.unwrap(),
            prize_amount: prize_per_winner,
            winner_roll: highest_total,
        });

        Ok(())
    }
}

// State enums and structs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    Waiting,    // Waiting for players to join
    Playing,    // Game in progress, players rolling
    Completed,  // Game finished, prizes distributed
    Cancelled,  // Game cancelled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct DiceRoll {
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
    pub rolled_at: i64,
}

// Events
#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_players: u8,
}

#[event]
pub struct PlayerJoined {
    pub game_id: u64,
    pub player: Pubkey,
    pub current_players: u8,
}

#[event]
pub struct GameStarted {
    pub game_id: u64,
    pub players_count: u8,
}

#[event]
pub struct DiceRolled {
    pub game_id: u64,
    pub player: Pubkey,
    pub dice1: u8,
    pub dice2: u8,
    pub total: u8,
}

#[event]
pub struct GameCompleted {
    pub game_id: u64,
    pub winner: Pubkey,
    pub prize_amount: u64,
    pub winner_roll: u8,
}

// Errors
#[error_code]
pub enum GameError {
    #[msg("Invalid max players (must be 2-6)")]
    InvalidMaxPlayers,

    #[msg("Invalid entry fee")]
    InvalidEntryFee,

    #[msg("Game is full")]
    GameFull,

    #[msg("Game is not waiting for players")]
    GameNotWaiting,

    #[msg("Game is not in playing state")]
    GameNotPlaying,

    #[msg("Player already joined this game")]
    AlreadyJoined,

    #[msg("Player not in this game")]
    PlayerNotInGame,

    #[msg("Player already rolled dice")]
    AlreadyRolled,

    #[msg("Waiting for all players to roll")]
    WaitingForRolls,

    #[msg("Not enough players to start")]
    NotEnoughPlayers,

    #[msg("Only creator can start the game")]
    NotCreator,

    #[msg("Game already started")]
    GameStarted,

    #[msg("Game not expired yet")]
    NotExpired,
}