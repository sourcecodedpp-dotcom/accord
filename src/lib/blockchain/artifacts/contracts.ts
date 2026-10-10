import escrowArtifact from "./AccordEscrow.json";
import usdcArtifact from "./MockUSDC.json";

export const ACCORD_ESCROW_ABI = escrowArtifact.abi;
export const ACCORD_ESCROW_BYTECODE = escrowArtifact.bytecode as `0x${string}`;

export const MOCK_USDC_ABI = usdcArtifact.abi;
export const MOCK_USDC_BYTECODE = usdcArtifact.bytecode as `0x${string}`;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_USDC_ADDRESS = (process.env.ACCORD_USDC_CONTRACT_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`; // Circle Native USDC on Base Sepolia
