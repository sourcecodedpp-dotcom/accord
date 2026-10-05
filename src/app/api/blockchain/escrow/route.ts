import { NextRequest, NextResponse } from "next/server";
import {
  ACCORD_EIP712_DOMAIN,
  SUBMISSION_EIP712_TYPES,
  ERC20_USDC_ABI,
  ACCORD_ESCROW_ABI,
  BlockchainEscrowService,
} from "@/lib/blockchain/escrow";
import { z } from "zod";

const HashPayloadSchema = z.object({
  content: z.string(),
});

export async function GET() {
  return NextResponse.json({
    protocol: "Accord Polis Escrow Protocol",
    chain: {
      name: "Polis / Base EVM Compatible",
      chainId: ACCORD_EIP712_DOMAIN.chainId,
    },
    contracts: {
      escrowContract: ACCORD_EIP712_DOMAIN.verifyingContract,
      usdcToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Standard USDC on Base/EVM
    },
    eip712: {
      domain: ACCORD_EIP712_DOMAIN,
      types: SUBMISSION_EIP712_TYPES,
    },
    abi: {
      usdc: ERC20_USDC_ABI,
      escrow: ACCORD_ESCROW_ABI,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = HashPayloadSchema.parse(body);

    const hash = BlockchainEscrowService.hashContent(content);

    return NextResponse.json({
      success: true,
      contentLength: content.length,
      sha256Hash: hash,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process hash request" },
      { status: 400 }
    );
  }
}
