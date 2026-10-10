import assert from "node:assert/strict";
import {
  createPublicClient,
  createWalletClient,
  custom,
  parseUnits,
  formatUnits,
  type PublicClient,
  type WalletClient,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
// @ts-ignore
import ganache from "ganache";
import {
  ACCORD_ESCROW_ABI,
  ACCORD_ESCROW_BYTECODE,
  MOCK_USDC_ABI,
  MOCK_USDC_BYTECODE,
  BASE_SEPOLIA_CHAIN_ID,
} from "../src/lib/blockchain/artifacts/contracts";
import { AccordTestnetEscrowLedger } from "../src/lib/blockchain/accord-escrow-ledger";
import {
  AlreadySettledError,
  BlockchainEscrowError,
} from "@accord/protocol";
import crypto from "crypto";

async function runContractUnitTests() {
  console.log("================================================================================");
  console.log("ACCORD // BASE SEPOLIA SMART CONTRACT & LEDGER UNIT TEST SUITE");
  console.log("================================================================================\n");

  // 1. Initialize Base Sepolia Local EVM Provider
  console.log("🧪 1. Starting Base Sepolia EVM Provider (Chain ID: 84532)...");
  const provider = ganache.provider({
    chain: { chainId: BASE_SEPOLIA_CHAIN_ID },
    logging: { quiet: true },
    wallet: {
      totalAccounts: 5,
      defaultBalance: 100, // 100 ETH for gas
    },
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: custom(provider),
  });

  // Get test accounts and private keys from ganache
  const initialAccountsEntries = Object.entries(provider.getInitialAccounts()) as [Address, any][];
  const deployerAcc = privateKeyToAccount(initialAccountsEntries[0][1].secretKey as `0x${string}`);
  const sponsorAcc = privateKeyToAccount(initialAccountsEntries[1][1].secretKey as `0x${string}`);
  const operatorAcc = privateKeyToAccount(initialAccountsEntries[2][1].secretKey as `0x${string}`);
  const treasuryFeeRecipient = initialAccountsEntries[3][0] as Address;
  const winningAgent = initialAccountsEntries[4][0] as Address;

  const deployer = deployerAcc.address;
  const sponsor = sponsorAcc.address;
  const protocolOperator = operatorAcc.address;

  const deployerWallet = createWalletClient({
    account: deployerAcc,
    chain: baseSepolia,
    transport: custom(provider),
  });

  const sponsorWallet = createWalletClient({
    account: sponsorAcc,
    chain: baseSepolia,
    transport: custom(provider),
  });

  const operatorWallet = createWalletClient({
    account: operatorAcc,
    chain: baseSepolia,
    transport: custom(provider),
  });

  console.log(`   Deployer:         ${deployer}`);
  console.log(`   Sponsor:          ${sponsor}`);
  console.log(`   ProtocolOperator: ${protocolOperator}`);
  console.log(`   Treasury:         ${treasuryFeeRecipient}`);
  console.log(`   Winning Agent:    ${winningAgent}\n`);

  // 2. Deploy MockUSDC (6 decimals)
  console.log("🧪 2. Deploying Mock USDC Contract (6 Decimals)...");
  const usdcDeployTx = await deployerWallet.deployContract({
    abi: MOCK_USDC_ABI,
    bytecode: MOCK_USDC_BYTECODE,
    args: [],
  });
  const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcDeployTx });
  const usdcAddress = usdcReceipt.contractAddress!;
  assert.ok(usdcAddress, "MockUSDC must be deployed");
  console.log(`   ✅ MockUSDC deployed at: ${usdcAddress}`);

  // 3. Deploy AccordEscrow.sol
  console.log("\n🧪 3. Deploying AccordEscrow.sol on Base Sepolia...");
  const escrowDeployTx = await deployerWallet.deployContract({
    abi: ACCORD_ESCROW_ABI,
    bytecode: ACCORD_ESCROW_BYTECODE,
    args: [usdcAddress, protocolOperator, treasuryFeeRecipient],
  });
  const escrowReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowDeployTx });
  const escrowAddress = escrowReceipt.contractAddress!;
  assert.ok(escrowAddress, "AccordEscrow must be deployed");
  console.log(`   ✅ AccordEscrow deployed at: ${escrowAddress}`);

  // Verify contract immutables
  const onChainToken = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "usdcToken",
  });
  const onChainOp = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "protocolOperator",
  });
  const onChainFeeRecipient = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "protocolFeeRecipient",
  });
  assert.equal((onChainToken as string).toLowerCase(), usdcAddress.toLowerCase());
  assert.equal((onChainOp as string).toLowerCase(), protocolOperator.toLowerCase());
  assert.equal((onChainFeeRecipient as string).toLowerCase(), treasuryFeeRecipient.toLowerCase());
  console.log("   ✅ Contract immutables and operator bindings verified.");

  // 4. Fund Sponsor with USDC and Approve Escrow Contract
  console.log("\n🧪 4. Minting 10,000 USDC to Sponsor and Approving Escrow Contract...");
  const mintAmount = parseUnits("10000", 6);
  const mintTx = await deployerWallet.writeContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "mint",
    args: [sponsor, mintAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintTx });

  const sponsorBalance = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [sponsor],
  })) as bigint;
  assert.equal(sponsorBalance, mintAmount, "Sponsor should have 10,000 USDC");

  // Sponsor approves AccordEscrow
  const approveTx = await sponsorWallet.writeContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "approve",
    args: [escrowAddress, parseUnits("100000", 6)],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("   ✅ Sponsor funded with $10,000 USDC and approved AccordEscrow.");

  // 5. Test depositEscrow
  console.log("\n🧪 5. Testing depositEscrow ($500 USDC)...");
  const bountyId1 = "bounty_test_bfs_001";
  const depositAmount1 = parseUnits("500", 6);

  const depositTx1 = await sponsorWallet.writeContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "depositEscrow",
    args: [bountyId1, depositAmount1],
  });
  const depositReceipt1 = await publicClient.waitForTransactionReceipt({ hash: depositTx1 });
  assert.equal(depositReceipt1.status, "success");

  // Verify escrow contract USDC balance
  const contractBalance = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [escrowAddress],
  })) as bigint;
  assert.equal(contractBalance, depositAmount1, "Contract should hold 500 USDC");

  // Verify on-chain escrow state
  const isHeld = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "isEscrowHeld",
    args: [bountyId1],
  });
  assert.equal(isHeld, true, "isEscrowHeld must return true");

  const escrowData: any = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "getEscrow",
    args: [bountyId1],
  });
  assert.equal(escrowData.bountyId, bountyId1);
  assert.equal(escrowData.depositor.toLowerCase(), sponsor.toLowerCase());
  assert.equal(escrowData.amount, depositAmount1);
  assert.equal(escrowData.status, 1, "Status must be 1 (HELD)");
  console.log(`   ✅ Escrow deposited and verified on-chain. Status: HELD, Amount: $500 USDC.`);

  // 6. Test Duplicate Deposit Rejection
  console.log("\n🧪 6. Testing Duplicate Deposit Rejection...");
  let dupDepositRejected = false;
  try {
    await sponsorWallet.writeContract({
      address: escrowAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "depositEscrow",
      args: [bountyId1, depositAmount1],
    });
  } catch (err: any) {
    dupDepositRejected = true;
    console.log(`   ✅ Duplicate deposit rejected by contract.`);
  }
  assert.ok(dupDepositRejected, "Contract must revert on duplicate deposit for same bountyId");

  // 7. Test Unauthorized Release Rejection
  console.log("\n🧪 7. Testing Unauthorized Release Rejection (Non-Operator)...");
  let unauthReleaseRejected = false;
  try {
    await sponsorWallet.writeContract({
      address: escrowAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "releaseEscrow",
      args: [
        bountyId1,
        winningAgent,
        parseUnits("487.5", 6),
        parseUnits("12.5", 6),
        `0x${"a".repeat(64)}`,
      ],
    });
  } catch (err: any) {
    unauthReleaseRejected = true;
    console.log(`   ✅ Non-operator release rejected.`);
  }
  assert.ok(unauthReleaseRejected, "Only protocol operator can call releaseEscrow");

  // 8. Test Amount Mismatch Rejection
  console.log("\n🧪 8. Testing Amount Mismatch Rejection...");
  let amountMismatchRejected = false;
  try {
    await operatorWallet.writeContract({
      address: escrowAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "releaseEscrow",
      args: [
        bountyId1,
        winningAgent,
        parseUnits("400", 6), // 400 + 12.5 != 500
        parseUnits("12.5", 6),
        `0x${"a".repeat(64)}`,
      ],
    });
  } catch (err: any) {
    amountMismatchRejected = true;
    console.log(`   ✅ Amount mismatch rejected by contract.`);
  }
  assert.ok(amountMismatchRejected, "Contract must revert if netPayout + fee != escrow.amount");

  // 9. Test releaseEscrow to Winning Agent
  console.log("\n🧪 9. Executing releaseEscrow to Winning Agent ($487.50 net, $12.50 fee)...");
  const netPayout = parseUnits("487.5", 6);
  const protocolFee = parseUnits("12.5", 6);
  const proofHash = `0x${crypto.createHash("sha256").update("proof:consensus").digest("hex")}` as `0x${string}`;

  const releaseTx = await operatorWallet.writeContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "releaseEscrow",
    args: [bountyId1, winningAgent, netPayout, protocolFee, proofHash],
  });
  const releaseReceipt = await publicClient.waitForTransactionReceipt({ hash: releaseTx });
  assert.equal(releaseReceipt.status, "success");

  // Verify Balances
  const winnerBal = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [winningAgent],
  })) as bigint;
  const treasuryBal = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [treasuryFeeRecipient],
  })) as bigint;
  const contractBalAfter = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [escrowAddress],
  })) as bigint;

  assert.equal(winnerBal, netPayout, "Winner must receive $487.50 USDC");
  assert.equal(treasuryBal, protocolFee, "Treasury must receive $12.50 USDC");
  assert.equal(contractBalAfter, 0n, "Contract balance must be 0 after full release");

  // Verify on-chain status = 2 (RELEASED)
  const escrowDataReleased: any = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "getEscrow",
    args: [bountyId1],
  });
  assert.equal(escrowDataReleased.status, 2, "Status must be 2 (RELEASED)");
  assert.equal(escrowDataReleased.recipient.toLowerCase(), winningAgent.toLowerCase());
  console.log(`   ✅ Released on-chain! Winner received $487.50 USDC, Treasury received $12.50 USDC.`);

  // 10. Test Double Release Prevention
  console.log("\n🧪 10. Testing Double Release Prevention...");
  let doubleReleaseRejected = false;
  try {
    await operatorWallet.writeContract({
      address: escrowAddress,
      abi: ACCORD_ESCROW_ABI,
      functionName: "releaseEscrow",
      args: [bountyId1, winningAgent, netPayout, protocolFee, proofHash],
    });
  } catch (err: any) {
    doubleReleaseRejected = true;
    console.log(`   ✅ Double release strictly prevented by contract.`);
  }
  assert.ok(doubleReleaseRejected, "Contract must revert if already RELEASED");

  // 11. Test refundEscrow
  console.log("\n🧪 11. Testing refundEscrow for Expired Bounty...");
  const bountyIdRefund = "bounty_test_refund_002";
  const refundAmount = parseUnits("200", 6);

  await sponsorWallet.writeContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "depositEscrow",
    args: [bountyIdRefund, refundAmount],
  });

  const sponsorBalBeforeRefund = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [sponsor],
  })) as bigint;

  // Refund escrow
  const refundTx = await sponsorWallet.writeContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "refundEscrow",
    args: [bountyIdRefund],
  });
  const refundReceipt = await publicClient.waitForTransactionReceipt({ hash: refundTx });
  assert.equal(refundReceipt.status, "success");

  const sponsorBalAfterRefund = (await publicClient.readContract({
    address: usdcAddress,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: [sponsor],
  })) as bigint;
  assert.equal(sponsorBalAfterRefund - sponsorBalBeforeRefund, refundAmount, "Sponsor refunded 200 USDC");

  const escrowRefundedData: any = await publicClient.readContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "getEscrow",
    args: [bountyIdRefund],
  });
  assert.equal(escrowRefundedData.status, 3, "Status must be 3 (REFUNDED)");
  console.log(`   ✅ Refund verified on-chain. Funds restored to sponsor.`);

  // 12. Test AccordTestnetEscrowLedger Provider Wrapper
  console.log("\n🧪 12. Testing AccordTestnetEscrowLedger Provider (Real EVM Integration)...");
  const ledger = new AccordTestnetEscrowLedger({
    contractAddress: escrowAddress,
    usdcAddress,
    publicClient,
    walletClient: operatorWallet,
  });

  // Test reading state of bounty 1
  const state1 = await ledger.getEscrowState(bountyId1);
  assert.ok(state1, "State must exist");
  assert.equal(state1.status, "RELEASED");
  assert.equal(state1.amountUsdc, 500);
  assert.equal(state1.isOnChain, true);
  assert.equal(state1.chainId, 84532);

  // Test release attempt on already settled bounty throws AlreadySettledError
  let ledgerAlreadySettledCaught = false;
  try {
    await ledger.releaseEscrow({
      bountyId: bountyId1,
      escrowLedgerId: `${escrowAddress}:${bountyId1}`,
      winnerAddress: winningAgent,
      amountUsdc: 487.5,
      protocolFeeUsdc: 12.5,
      verificationProofHash: "proof_test",
    });
  } catch (err: any) {
    ledgerAlreadySettledCaught = true;
    assert.ok(
      err instanceof AlreadySettledError || err.code === "ALREADY_SETTLED",
      `Expected AlreadySettledError, got ${err.name}`
    );
    console.log(`   ✅ AccordTestnetEscrowLedger rejected duplicate settlement: ${err.message}`);
  }
  assert.ok(ledgerAlreadySettledCaught, "Ledger must throw AlreadySettledError on duplicate settlement");

  // Test creating new escrow via ledger and settling
  const bountyIdLedger = "bounty_test_ledger_003";
  // Sponsor deposits
  await sponsorWallet.writeContract({
    address: escrowAddress,
    abi: ACCORD_ESCROW_ABI,
    functionName: "depositEscrow",
    args: [bountyIdLedger, parseUnits("300", 6)],
  });

  const ledgerState = await ledger.getEscrowState(bountyIdLedger);
  assert.equal(ledgerState?.status, "HELD_IN_ESCROW");
  assert.equal(ledgerState?.isOnChain, true);

  // Settle via ledger
  const ledgerReleaseReceipt = await ledger.releaseEscrow({
    bountyId: bountyIdLedger,
    escrowLedgerId: `${escrowAddress}:${bountyIdLedger}`,
    winnerAddress: winningAgent,
    amountUsdc: 292.5,
    protocolFeeUsdc: 7.5,
    verificationProofHash: "proof_ledger_ok",
  });

  assert.equal(ledgerReleaseReceipt.isOnChain, true, "Must have isOnChain: true");
  assert.equal(ledgerReleaseReceipt.chainId, 84532);
  assert.equal(ledgerReleaseReceipt.ledgerType, "testnet");
  assert.ok(ledgerReleaseReceipt.txHash.startsWith("0x"));
  assert.ok(ledgerReleaseReceipt.blockNumber > 0);
  console.log(`   ✅ AccordTestnetEscrowLedger settled on-chain: tx=${ledgerReleaseReceipt.txHash}, block=${ledgerReleaseReceipt.blockNumber}`);

  // Test verifyTransaction
  const txValid = await ledger.verifyTransaction(ledgerReleaseReceipt.txHash);
  assert.equal(txValid, true, "Transaction must verify as successful on-chain");

  console.log("\n================================================================================");
  console.log("ALL 12 SMART CONTRACT & LEDGER UNIT TESTS PASSED (100% SUCCESS)");
  console.log("================================================================================\n");
}

runContractUnitTests().catch((err) => {
  console.error("❌ Smart contract test failed:", err);
  process.exit(1);
});
