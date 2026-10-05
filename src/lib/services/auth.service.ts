import crypto from "crypto";
import { db } from "../db";
import { verifyMessage } from "viem";
import { NextRequest } from "next/server";
import { Participant } from "@prisma/client";

const AUTH_SECRET = process.env.ACCORD_AUTH_SECRET || "accord_protocol_secret_key_minimum_32_characters_long";

export interface AuthSessionPayload {
  participantId: string;
  walletAddress: string;
  type: string;
  issuedAt: number;
  expiresAt: number;
}

export class AuthService {
  /**
   * Generates a cryptographically secure Accord API key for autonomous agents
   */
  static generateApiKey(): { apiKey: string; apiKeyHash: string } {
    const rawSecret = crypto.randomBytes(32).toString("hex");
    const apiKey = `accord_live_${rawSecret}`;
    const apiKeyHash = this.hashApiKey(apiKey);
    return { apiKey, apiKeyHash };
  }

  /**
   * Hashes an API key using SHA-256 for secure database lookup
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  /**
   * Generates a sign-in challenge nonce for wallet authentication
   */
  static async generateNonce(walletAddress: string): Promise<string> {
    const nonce = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.participant.updateMany({
      where: { walletAddress },
      data: {
        authNonce: nonce,
        authNonceExpiresAt: expiresAt,
      },
    });

    return nonce;
  }

  /**
   * Generates a tamper-proof HMAC-SHA256 session token
   */
  static createSessionToken(participant: Participant): string {
    const payload: AuthSessionPayload = {
      participantId: participant.id,
      walletAddress: participant.walletAddress,
      type: participant.type,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 3600 * 1000, // 30 days
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payloadB64)
      .digest("base64url");

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies and decodes an Accord session token
   */
  static verifySessionToken(token: string): AuthSessionPayload | null {
    try {
      const [payloadB64, signature] = token.split(".");
      if (!payloadB64 || !signature) return null;

      const expectedSignature = crypto
        .createHmac("sha256", AUTH_SECRET)
        .update(payloadB64)
        .digest("base64url");

      if (signature !== expectedSignature) return null;

      const payload: AuthSessionPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf8")
      );

      if (Date.now() > payload.expiresAt) return null;

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticates an incoming HTTP request via Bearer session token or x-accord-api-key
   */
  static async authenticateRequest(req: NextRequest): Promise<Participant | null> {
    const authHeader = req.headers.get("authorization");
    const apiKeyHeader = req.headers.get("x-accord-api-key");

    // 1. Check API Key
    if (apiKeyHeader) {
      const apiKeyHash = this.hashApiKey(apiKeyHeader);
      const participant = await db.participant.findUnique({
        where: { apiKeyHash },
      });
      if (participant) return participant;
    }

    // 2. Check Bearer Token
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      // Check if it's an API Key directly in Authorization header
      if (token.startsWith("accord_live_")) {
        const apiKeyHash = this.hashApiKey(token);
        const participant = await db.participant.findUnique({
          where: { apiKeyHash },
        });
        if (participant) return participant;
      }

      // Check if it's a signed session token
      const session = this.verifySessionToken(token);
      if (session) {
        const participant = await db.participant.findUnique({
          where: { id: session.participantId },
        });
        if (participant) return participant;
      }
    }

    return null;
  }

  /**
   * Verifies a wallet signature against a stored challenge nonce
   */
  static async verifyWalletLogin(walletAddress: string, signature: string): Promise<Participant> {
    const participant = await db.participant.findUnique({
      where: { walletAddress },
    });

    if (!participant) {
      throw new Error(`Participant with wallet ${walletAddress} is not registered`);
    }

    if (!participant.authNonce || !participant.authNonceExpiresAt) {
      throw new Error(`No active challenge nonce found. Call /api/auth/nonce first`);
    }

    if (new Date() > participant.authNonceExpiresAt) {
      throw new Error(`Challenge nonce has expired. Please request a new nonce`);
    }

    const message = `Accord Authentication Challenge: ${participant.authNonce}`;
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      throw new Error(`Invalid cryptographic wallet signature`);
    }

    // Clear consumed nonce
    await db.participant.update({
      where: { id: participant.id },
      data: {
        authNonce: null,
        authNonceExpiresAt: null,
      },
    });

    return participant;
  }
}
