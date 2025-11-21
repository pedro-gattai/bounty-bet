import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultBetting } from "../target/types/vault_betting";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("vault-betting", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VaultBetting as Program<VaultBetting>;

  // Test accounts
  let participantA: Keypair;
  let participantB: Keypair;
  let arbiter: Keypair;
  let groupBettor: Keypair;
  let betPDA: PublicKey;
  let betId: anchor.BN;

  beforeEach(async () => {
    // Generate test accounts
    participantA = Keypair.generate();
    participantB = Keypair.generate();
    arbiter = Keypair.generate();
    groupBettor = Keypair.generate();
    betId = new anchor.BN(Date.now());

    // Find PDA for bet account
    [betPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), betId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    await provider.connection.requestAirdrop(participantA.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(participantB.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(arbiter.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(groupBettor.publicKey, airdropAmount);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("Two-Party Betting (Core Requirement)", () => {
    it("Creates a two-party bet", async () => {
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(60); // 60 seconds

      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      const bet = await program.account.betAccount.fetch(betPDA);

      assert.equal(bet.betId.toString(), betId.toString());
      assert.equal(bet.participantA.toString(), participantA.publicKey.toString());
      assert.equal(bet.participantB.toString(), participantB.publicKey.toString());
      assert.equal(bet.arbiter.toString(), arbiter.publicKey.toString());
      assert.equal(bet.betAmount.toString(), betAmount.toString());
      assert.equal(bet.status.waitingForDeposits, true);
    });

    it("Both participants deposit funds", async () => {
      const betAmount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(60);

      // Create bet
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      // Participant A deposits
      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      let bet = await program.account.betAccount.fetch(betPDA);
      assert.equal(bet.participantADeposited, true);
      assert.equal(bet.participantBDeposited, false);
      assert.equal(bet.status.waitingForDeposits, true);

      // Participant B deposits
      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      bet = await program.account.betAccount.fetch(betPDA);
      assert.equal(bet.participantADeposited, true);
      assert.equal(bet.participantBDeposited, true);
      assert.equal(bet.status.active, true);
      assert.equal(bet.totalPool.toString(), (betAmount.toNumber() * 2).toString());
    });

    it("Only arbiter can declare winner after minimum time", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(1); // 1 second for testing

      // Setup: Create bet and both deposit
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      // Wait for minimum time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Arbiter declares winner
      await program.methods
        .declareWinner(participantA.publicKey)
        .accounts({
          betAccount: betPDA,
          arbiter: arbiter.publicKey,
        })
        .signers([arbiter])
        .rpc();

      const bet = await program.account.betAccount.fetch(betPDA);
      assert.equal(bet.winner.toString(), participantA.publicKey.toString());
      assert.equal(bet.status.completed, true);
    });

    it("Winner can withdraw winnings", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(1);

      // Setup: Create bet, deposit, and declare winner
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      await new Promise(resolve => setTimeout(resolve, 2000));

      await program.methods
        .declareWinner(participantA.publicKey)
        .accounts({
          betAccount: betPDA,
          arbiter: arbiter.publicKey,
        })
        .signers([arbiter])
        .rpc();

      // Get balance before withdrawal
      const balanceBefore = await provider.connection.getBalance(participantA.publicKey);

      // Winner withdraws
      await program.methods
        .withdrawWinnings()
        .accounts({
          betAccount: betPDA,
          winner: participantA.publicKey,
        })
        .signers([participantA])
        .rpc();

      // Check balance increased (minus platform fee)
      const balanceAfter = await provider.connection.getBalance(participantA.publicKey);
      const expectedPrize = (betAmount.toNumber() * 2 * 0.8); // 80% after 20% platform fee

      // Account for transaction fees
      assert.isTrue(balanceAfter > balanceBefore);
    });
  });

  describe("Group Betting (Extra 1)", () => {
    it("Allows additional users to bet on participants", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const groupBetAmount = new anchor.BN(0.05 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(60);

      // Setup: Create and activate bet
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      // Group bettor places bet on participant A
      const [groupBetPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("group_bet"),
          betId.toArrayLike(Buffer, "le", 8),
          groupBettor.publicKey.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .placeGroupBet(participantA.publicKey, groupBetAmount)
        .accounts({
          betAccount: betPDA,
          groupBetAccount: groupBetPDA,
          bettor: groupBettor.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([groupBettor])
        .rpc();

      const groupBet = await program.account.groupBetAccount.fetch(groupBetPDA);
      assert.equal(groupBet.bettor.toString(), groupBettor.publicKey.toString());
      assert.equal(groupBet.choice.toString(), participantA.publicKey.toString());
      assert.equal(groupBet.amount.toString(), groupBetAmount.toString());
    });
  });

  describe("Multi-Party Betting (Extra 2)", () => {
    it("Creates and joins multi-party bet", async () => {
      const entryFee = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(60);
      const maxParticipants = 5;
      const multiPartyBetId = new anchor.BN(Date.now() + 1000);

      const [multiBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("multi_bet"), multiPartyBetId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      // Create multi-party bet
      await program.methods
        .createMultiPartyBet(
          multiPartyBetId,
          arbiter.publicKey,
          entryFee,
          minDecisionTime,
          maxParticipants
        )
        .accounts({
          multiBetAccount: multiBetPDA,
          creator: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      let multiBet = await program.account.multiPartyBetAccount.fetch(multiBetPDA);
      assert.equal(multiBet.participants.length, 1);
      assert.equal(multiBet.participants[0].toString(), participantA.publicKey.toString());

      // Another participant joins
      await program.methods
        .joinMultiPartyBet()
        .accounts({
          multiBetAccount: multiBetPDA,
          participant: participantB.publicKey,
        })
        .signers([participantB])
        .rpc();

      multiBet = await program.account.multiPartyBetAccount.fetch(multiBetPDA);
      assert.equal(multiBet.participants.length, 2);
      assert.equal(multiBet.participants[1].toString(), participantB.publicKey.toString());
    });
  });

  describe("Edge Cases and Security", () => {
    it("Prevents double deposits", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(60);

      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      // Try to deposit again - should fail
      try {
        await program.methods
          .depositBetFunds()
          .accounts({
            betAccount: betPDA,
            depositor: participantA.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([participantA])
          .rpc();
        assert.fail("Should have thrown error for double deposit");
      } catch (error) {
        assert.include(error.toString(), "AlreadyDeposited");
      }
    });

    it("Prevents non-arbiter from declaring winner", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(1);

      // Setup active bet
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to declare winner as non-arbiter - should fail
      try {
        await program.methods
          .declareWinner(participantA.publicKey)
          .accounts({
            betAccount: betPDA,
            arbiter: participantA.publicKey,
          })
          .signers([participantA])
          .rpc();
        assert.fail("Should have thrown error for unauthorized arbiter");
      } catch (error) {
        assert.include(error.toString(), "UnauthorizedArbiter");
      }
    });

    it("Enforces minimum decision time", async () => {
      const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
      const minDecisionTime = new anchor.BN(10); // 10 seconds

      // Setup active bet
      await program.methods
        .createTwoPartyBet(
          betId,
          participantB.publicKey,
          arbiter.publicKey,
          betAmount,
          minDecisionTime
        )
        .accounts({
          betAccount: betPDA,
          participantA: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantA.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantA])
        .rpc();

      await program.methods
        .depositBetFunds()
        .accounts({
          betAccount: betPDA,
          depositor: participantB.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participantB])
        .rpc();

      // Try to declare winner immediately - should fail
      try {
        await program.methods
          .declareWinner(participantA.publicKey)
          .accounts({
            betAccount: betPDA,
            arbiter: arbiter.publicKey,
          })
          .signers([arbiter])
          .rpc();
        assert.fail("Should have thrown error for minimum time not met");
      } catch (error) {
        assert.include(error.toString(), "MinimumTimeNotMet");
      }
    });
  });
});