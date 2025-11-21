use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("8AUxvDBey9utjsGvtnaAjFeX33SBtMbzeuQPad3BGYAK");

#[program]
pub mod vault_betting {
    use super::*;

    /// Creates a two-party bet with designated arbiter
    pub fn create_two_party_bet(
        ctx: Context<CreateTwoPartyBet>,
        bet_id: u64,
        participant_b: Pubkey,
        arbiter: Pubkey,
        bet_amount: u64,
        minimum_decision_time: i64, // seconds until arbiter can decide
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet_account;
        let clock = Clock::get()?;

        bet.bet_id = bet_id;
        bet.participant_a = ctx.accounts.participant_a.key();
        bet.participant_b = participant_b;
        bet.arbiter = arbiter;
        bet.bet_amount = bet_amount;
        bet.participant_a_deposited = false;
        bet.participant_b_deposited = false;
        bet.total_pool = 0;
        bet.created_at = clock.unix_timestamp;
        bet.minimum_decision_time = minimum_decision_time;
        bet.status = BetStatus::WaitingForDeposits;
        bet.winner = None;
        bet.bet_type = BetType::TwoParty;

        msg!("Two-party bet created: ID {}", bet_id);
        Ok(())
    }

    /// Deposit funds for the bet (both participants must deposit)
    pub fn deposit_bet_funds(ctx: Context<DepositFunds>) -> Result<()> {
        let bet = &mut ctx.accounts.bet_account;
        let depositor = ctx.accounts.depositor.key();

        require!(
            bet.status == BetStatus::WaitingForDeposits,
            BettingError::InvalidBetStatus
        );

        // Check if depositor is participant A or B
        if depositor == bet.participant_a {
            require!(!bet.participant_a_deposited, BettingError::AlreadyDeposited);

            // Transfer SOL from participant to bet PDA
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: bet.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_context, bet.bet_amount)?;

            bet.participant_a_deposited = true;
            bet.total_pool += bet.bet_amount;
            msg!("Participant A deposited {} lamports", bet.bet_amount);

        } else if depositor == bet.participant_b {
            require!(!bet.participant_b_deposited, BettingError::AlreadyDeposited);

            // Transfer SOL from participant to bet PDA
            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: bet.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_context, bet.bet_amount)?;

            bet.participant_b_deposited = true;
            bet.total_pool += bet.bet_amount;
            msg!("Participant B deposited {} lamports", bet.bet_amount);

        } else {
            return Err(BettingError::UnauthorizedDepositor.into());
        }

        // Check if both have deposited to start the bet
        if bet.participant_a_deposited && bet.participant_b_deposited {
            bet.status = BetStatus::Active;
            let clock = Clock::get()?;
            bet.bet_start_time = Some(clock.unix_timestamp);
            msg!("Bet is now active! Both participants have deposited.");
        }

        Ok(())
    }

    /// Arbiter declares the winner (only after minimum time has passed)
    pub fn declare_winner(
        ctx: Context<DeclareWinner>,
        winner: Pubkey,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet_account;
        let clock = Clock::get()?;

        // Only arbiter can declare winner
        require!(
            ctx.accounts.arbiter.key() == bet.arbiter,
            BettingError::UnauthorizedArbiter
        );

        // Bet must be active
        require!(
            bet.status == BetStatus::Active,
            BettingError::InvalidBetStatus
        );

        // Check if minimum time has passed
        let bet_start = bet.bet_start_time.unwrap_or(0);
        let time_elapsed = clock.unix_timestamp - bet_start;
        require!(
            time_elapsed >= bet.minimum_decision_time,
            BettingError::MinimumTimeNotMet
        );

        // Winner must be one of the participants
        require!(
            winner == bet.participant_a || winner == bet.participant_b,
            BettingError::InvalidWinner
        );

        bet.winner = Some(winner);
        bet.status = BetStatus::Completed;
        bet.completed_at = Some(clock.unix_timestamp);

        msg!("Winner declared: {}", winner);
        Ok(())
    }

    /// Winner withdraws the entire prize pool
    pub fn withdraw_winnings(ctx: Context<WithdrawWinnings>) -> Result<()> {
        let bet = &ctx.accounts.bet_account;

        // Check bet is completed
        require!(
            bet.status == BetStatus::Completed,
            BettingError::BetNotCompleted
        );

        // Check caller is the winner
        let winner = bet.winner.ok_or(BettingError::NoWinnerDeclared)?;
        require!(
            ctx.accounts.winner.key() == winner,
            BettingError::NotTheWinner
        );

        // Calculate prize (total pool minus platform fee)
        let platform_fee = (bet.total_pool * PLATFORM_FEE_BPS as u64) / 10000;
        let prize_amount = bet.total_pool - platform_fee;

        // Transfer prize to winner
        **ctx.accounts.bet_account.to_account_info().try_borrow_mut_lamports()? -= prize_amount;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += prize_amount;

        msg!("Winner withdrew {} lamports (platform fee: {} lamports)",
             prize_amount, platform_fee);

        Ok(())
    }

    /// EXTRA 1: Allow additional users to bet on participant A or B
    pub fn place_group_bet(
        ctx: Context<PlaceGroupBet>,
        choice: Pubkey, // participant_a or participant_b
        amount: u64,
    ) -> Result<()> {
        let bet = &ctx.accounts.bet_account;
        let group_bet = &mut ctx.accounts.group_bet_account;
        let clock = Clock::get()?;

        // Bet must be active
        require!(
            bet.status == BetStatus::Active,
            BettingError::InvalidBetStatus
        );

        // Choice must be one of the participants
        require!(
            choice == bet.participant_a || choice == bet.participant_b,
            BettingError::InvalidChoice
        );

        // Transfer SOL from bettor to bet PDA
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: ctx.accounts.bet_account.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Record the group bet
        group_bet.bet_id = bet.bet_id;
        group_bet.bettor = ctx.accounts.bettor.key();
        group_bet.choice = choice;
        group_bet.amount = amount;
        group_bet.timestamp = clock.unix_timestamp;
        group_bet.claimed = false;

        msg!("Group bet placed: {} lamports on {}", amount, choice);
        Ok(())
    }

    /// EXTRA 2: Create multi-party competition (N participants)
    pub fn create_multi_party_bet(
        ctx: Context<CreateMultiPartyBet>,
        bet_id: u64,
        arbiter: Pubkey,
        entry_fee: u64,
        minimum_decision_time: i64,
        max_participants: u8,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.multi_bet_account;
        let clock = Clock::get()?;

        bet.bet_id = bet_id;
        bet.creator = ctx.accounts.creator.key();
        bet.arbiter = arbiter;
        bet.entry_fee = entry_fee;
        bet.participants = vec![ctx.accounts.creator.key()];
        bet.deposits = vec![false];
        bet.max_participants = max_participants;
        bet.total_pool = 0;
        bet.created_at = clock.unix_timestamp;
        bet.minimum_decision_time = minimum_decision_time;
        bet.status = BetStatus::WaitingForDeposits;
        bet.winner = None;
        bet.bet_type = BetType::MultiParty;

        msg!("Multi-party bet created: ID {}, max {} participants",
             bet_id, max_participants);
        Ok(())
    }

    /// Join a multi-party bet
    pub fn join_multi_party_bet(ctx: Context<JoinMultiPartyBet>) -> Result<()> {
        let bet = &mut ctx.accounts.multi_bet_account;

        require!(
            bet.status == BetStatus::WaitingForDeposits,
            BettingError::InvalidBetStatus
        );

        require!(
            bet.participants.len() < bet.max_participants as usize,
            BettingError::MaxParticipantsReached
        );

        require!(
            !bet.participants.contains(&ctx.accounts.participant.key()),
            BettingError::AlreadyJoined
        );

        bet.participants.push(ctx.accounts.participant.key());
        bet.deposits.push(false);

        msg!("Participant joined multi-party bet");
        Ok(())
    }

    /// EXTRA 3: Pay arbiter fee
    pub fn pay_arbiter_fee(ctx: Context<PayArbiterFee>) -> Result<()> {
        let bet = &ctx.accounts.bet_account;

        require!(
            bet.status == BetStatus::Completed,
            BettingError::BetNotCompleted
        );

        // Calculate arbiter fee (2% of total pool)
        let arbiter_fee = (bet.total_pool * ARBITER_FEE_BPS as u64) / 10000;

        // Transfer fee to arbiter
        **ctx.accounts.bet_account.to_account_info().try_borrow_mut_lamports()? -= arbiter_fee;
        **ctx.accounts.arbiter.try_borrow_mut_lamports()? += arbiter_fee;

        msg!("Arbiter fee paid: {} lamports", arbiter_fee);
        Ok(())
    }

    /// Cancel expired bet and refund participants
    pub fn cancel_expired_bet(ctx: Context<CancelBet>) -> Result<()> {
        let bet = &mut ctx.accounts.bet_account;
        let clock = Clock::get()?;

        // Can only cancel if still waiting for deposits after 24 hours
        require!(
            bet.status == BetStatus::WaitingForDeposits,
            BettingError::CannotCancelActiveBet
        );

        let time_elapsed = clock.unix_timestamp - bet.created_at;
        require!(
            time_elapsed > 86400, // 24 hours
            BettingError::NotExpiredYet
        );

        bet.status = BetStatus::Cancelled;

        // Refund logic would go here for any partial deposits
        msg!("Bet cancelled due to expiration");
        Ok(())
    }
}

// Account structures
#[account]
pub struct BetAccount {
    pub bet_id: u64,
    pub participant_a: Pubkey,
    pub participant_b: Pubkey,
    pub arbiter: Pubkey,
    pub bet_amount: u64,
    pub participant_a_deposited: bool,
    pub participant_b_deposited: bool,
    pub total_pool: u64,
    pub created_at: i64,
    pub bet_start_time: Option<i64>,
    pub completed_at: Option<i64>,
    pub minimum_decision_time: i64,
    pub status: BetStatus,
    pub winner: Option<Pubkey>,
    pub bet_type: BetType,
}

#[account]
pub struct MultiPartyBetAccount {
    pub bet_id: u64,
    pub creator: Pubkey,
    pub arbiter: Pubkey,
    pub entry_fee: u64,
    pub participants: Vec<Pubkey>,
    pub deposits: Vec<bool>,
    pub max_participants: u8,
    pub total_pool: u64,
    pub created_at: i64,
    pub bet_start_time: Option<i64>,
    pub completed_at: Option<i64>,
    pub minimum_decision_time: i64,
    pub status: BetStatus,
    pub winner: Option<Pubkey>,
    pub bet_type: BetType,
}

#[account]
pub struct GroupBetAccount {
    pub bet_id: u64,
    pub bettor: Pubkey,
    pub choice: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub claimed: bool,
}

#[account]
pub struct ArbiterStats {
    pub arbiter: Pubkey,
    pub total_arbitrated: u64,
    pub total_volume: u64,
    pub dispute_rate: u16,
    pub average_decision_time: i64,
    pub reputation_score: u32,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BetStatus {
    WaitingForDeposits,
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BetType {
    TwoParty,
    MultiParty,
    GroupBetting,
}

// Contexts
#[derive(Accounts)]
#[instruction(bet_id: u64)]
pub struct CreateTwoPartyBet<'info> {
    #[account(
        init,
        payer = participant_a,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 1 + 33 + 1,
        seeds = [b"bet", bet_id.to_le_bytes().as_ref()],
        bump
    )]
    pub bet_account: Account<'info, BetAccount>,

    #[account(mut)]
    pub participant_a: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositFunds<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    pub arbiter: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawWinnings<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(bet_id: u64)]
pub struct PlaceGroupBet<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    #[account(
        init,
        payer = bettor,
        space = 8 + 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"group_bet", bet_id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump
    )]
    pub group_bet_account: Account<'info, GroupBetAccount>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: u64)]
pub struct CreateMultiPartyBet<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 32 + 8 + (4 + 32 * 10) + (4 + 1 * 10) + 1 + 8 + 8 + 8 + 8 + 8 + 1 + 33 + 1,
        seeds = [b"multi_bet", bet_id.to_le_bytes().as_ref()],
        bump
    )]
    pub multi_bet_account: Account<'info, MultiPartyBetAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinMultiPartyBet<'info> {
    #[account(mut)]
    pub multi_bet_account: Account<'info, MultiPartyBetAccount>,

    pub participant: Signer<'info>,
}

#[derive(Accounts)]
pub struct PayArbiterFee<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    #[account(mut)]
    pub arbiter: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct CancelBet<'info> {
    #[account(mut)]
    pub bet_account: Account<'info, BetAccount>,

    pub authority: Signer<'info>,
}

// Error codes
#[error_code]
pub enum BettingError {
    #[msg("Invalid bet status for this operation")]
    InvalidBetStatus,

    #[msg("You have already deposited funds")]
    AlreadyDeposited,

    #[msg("You are not authorized to deposit to this bet")]
    UnauthorizedDepositor,

    #[msg("Only the arbiter can declare the winner")]
    UnauthorizedArbiter,

    #[msg("Minimum decision time has not passed yet")]
    MinimumTimeNotMet,

    #[msg("Winner must be one of the participants")]
    InvalidWinner,

    #[msg("Bet has not been completed yet")]
    BetNotCompleted,

    #[msg("No winner has been declared")]
    NoWinnerDeclared,

    #[msg("You are not the winner")]
    NotTheWinner,

    #[msg("Invalid choice for group bet")]
    InvalidChoice,

    #[msg("Maximum participants reached")]
    MaxParticipantsReached,

    #[msg("You have already joined this bet")]
    AlreadyJoined,

    #[msg("Cannot cancel an active bet")]
    CannotCancelActiveBet,

    #[msg("Bet has not expired yet")]
    NotExpiredYet,
}

// Constants
pub const PLATFORM_FEE_BPS: u16 = 2000; // 20%
pub const ARBITER_FEE_BPS: u16 = 200;   // 2%