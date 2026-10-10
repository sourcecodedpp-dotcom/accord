import { adminDb } from "./admin";
import { ProtocolEvent } from "../types/accord";

export class FirebaseSyncService {
  /**
   * Helper to write to Firestore safely without throwing if network/credentials unavailable
   */
  private static async safeWrite(action: () => Promise<any>): Promise<boolean> {
    if (!adminDb || !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return false;
    try {
      await action();
      return true;
    } catch (err: any) {
      // Non-blocking log to ensure authoritative Accord protocol is uninterrupted
      if (process.env.DEBUG_FIREBASE) {
        console.warn("[FirebaseSync] Note:", err?.message || err);
      }
      return false;
    }
  }

  /**
   * Mirror a bounty into bounties/{bountyId}
   */
  static async syncBounty(bounty: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("bounties").doc(bounty.id);
      await docRef.set(
        {
          bountyId: bounty.id,
          id: bounty.id,
          title: bounty.title,
          description: bounty.description,
          acceptanceCriteria: Array.isArray(bounty.acceptanceCriteria)
            ? bounty.acceptanceCriteria
            : typeof bounty.acceptanceCriteria === "string"
            ? JSON.parse(bounty.acceptanceCriteria || "[]")
            : [],
          rewardUsdc: Number(bounty.rewardUsdc),
          creatorId: bounty.creatorId,
          creatorType: bounty.creatorType || "HUMAN_PRINCIPAL",
          status: bounty.status,
          competitionMode: bounty.competitionMode || "TOURNAMENT",
          maxParticipants: bounty.maxParticipants ?? 10,
          minPassingScore: bounty.minPassingScore ?? 70,
          deadline: bounty.deadline instanceof Date ? bounty.deadline.toISOString() : bounty.deadline,
          registrationDeadline: bounty.registrationDeadline instanceof Date ? bounty.registrationDeadline.toISOString() : bounty.registrationDeadline || null,
          submissionDeadline: bounty.submissionDeadline instanceof Date ? bounty.submissionDeadline.toISOString() : bounty.submissionDeadline || null,
          escrowId: bounty.escrowLedgerId || null,
          escrowLedgerId: bounty.escrowLedgerId || null,
          escrowStatus: bounty.escrowStatus || "PENDING_DEPOSIT",
          escrowContract: bounty.escrowContract || "0x7f035eaba97b977aaaaf4168c905ebb75677c2f9",
          chainId: 84532, // Base Sepolia
          fundingTxHash: bounty.escrowTxHash || null,
          settlementTxHash: bounty.settlementTxHash || null,
          winnerAgentId: bounty.winnerAgentId || null,
          rankings: bounty.rankings ? (typeof bounty.rankings === "string" ? JSON.parse(bounty.rankings) : bounty.rankings) : null,
          createdAt: bounty.createdAt instanceof Date ? bounty.createdAt.toISOString() : bounty.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }

  /**
   * Mirror participant into bounties/{bountyId}/participants/{participantId}
   */
  static async syncParticipant(bountyId: string, participant: any) {
    return this.safeWrite(async () => {
      const pId = participant.agentId || participant.id;
      const docRef = adminDb!
        .collection("bounties")
        .doc(bountyId)
        .collection("participants")
        .doc(pId);

      await docRef.set(
        {
          participantId: pId,
          agentId: participant.agentId || pId,
          agentName: participant.agentName || participant.name || "Agent",
          walletAddress: participant.walletAddress || null,
          stakeUsdc: Number(participant.stakeUsdc || 0),
          joinedAt: participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : participant.joinedAt || new Date().toISOString(),
          status: "JOINED",
        },
        { merge: true }
      );

      // Also update participant count on parent bounty
      const bountyRef = adminDb!.collection("bounties").doc(bountyId);
      const snap = await bountyRef.collection("participants").get();
      await bountyRef.update({
        competitorCount: snap.size,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Mirror solution into bounties/{bountyId}/submissions/{submissionId}
   */
  static async syncSubmission(bountyId: string, submission: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!
        .collection("bounties")
        .doc(bountyId)
        .collection("submissions")
        .doc(submission.id);

      await docRef.set(
        {
          id: submission.id,
          submissionId: submission.id,
          bountyId,
          agentId: submission.agentId,
          deliverableType: submission.deliverableType,
          deliverableUrl: submission.deliverableUrl,
          contentHash: submission.contentHash,
          summary: submission.summary,
          submittedAt: submission.submittedAt instanceof Date ? submission.submittedAt.toISOString() : submission.submittedAt || new Date().toISOString(),
          status: submission.status || "PENDING_VERIFICATION",
          score: submission.score !== undefined ? Number(submission.score) : null,
          verdict: submission.verdict || null,
        },
        { merge: true }
      );

      // Also update submission count on parent bounty
      const bountyRef = adminDb!.collection("bounties").doc(bountyId);
      const snap = await bountyRef.collection("submissions").get();
      await bountyRef.update({
        submissionCount: snap.size,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  /**
   * Mirror verification into verifications/{verificationId}
   */
  static async syncVerification(verification: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("verifications").doc(verification.id);
      await docRef.set(
        {
          id: verification.id,
          verificationId: verification.id,
          bountyId: verification.bountyId,
          submissionId: verification.submissionId,
          agentId: verification.agentId,
          score: Number(verification.score),
          verdict: verification.verdict,
          reasoning: verification.reasoning || null,
          rubricBreakdown: verification.rubricBreakdown || null,
          consensusReached: verification.consensusReached ?? true,
          completedAt: verification.completedAt instanceof Date ? verification.completedAt.toISOString() : verification.completedAt || new Date().toISOString(),
        },
        { merge: true }
      );

      if (verification.bountyId && verification.submissionId) {
        // Update submission status in subcollection
        const subRef = adminDb!
          .collection("bounties")
          .doc(verification.bountyId)
          .collection("submissions")
          .doc(verification.submissionId);

        await subRef.set(
          {
            score: Number(verification.score),
            verdict: verification.verdict,
            verificationStatus: "COMPLETED",
            verifiedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });
  }

  /**
   * Mirror agent profile into agents/{agentId}
   */
  static async syncAgent(agent: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("agents").doc(agent.id);
      await docRef.set(
        {
          id: agent.id,
          agentId: agent.id,
          name: agent.name,
          walletAddress: agent.walletAddress,
          type: agent.type || "AI_AGENT",
          endpointUrl: agent.endpointUrl || null,
          bio: agent.bio || null,
          reputationScore: Number(agent.reputationScore ?? 100),
          settledVolumeUsdc: Number(agent.settledVolumeUsdc ?? 0),
          bountiesWonCount: Number(agent.bountiesWonCount ?? 0),
          createdAt: agent.createdAt instanceof Date ? agent.createdAt.toISOString() : agent.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }

  /**
   * Mirror reputation into reputation/{agentId}
   */
  static async syncReputation(agentId: string, rep: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("reputation").doc(agentId);
      await docRef.set(
        {
          agentId,
          score: Number(rep.score ?? rep.reputationScore ?? 100),
          badge: rep.badge || null,
          totalVolume: Number(rep.settledVolumeUsdc ?? 0),
          bountiesWon: Number(rep.bountiesWonCount ?? 0),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }

  /**
   * Mirror user profile into users/{userId}
   */
  static async syncUser(user: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("users").doc(user.id);
      await docRef.set(
        {
          id: user.id,
          email: user.email || null,
          displayName: user.displayName || user.name || "Accord User",
          accountType: user.accountType || (user.type === "AI_AGENT" ? "AGENT" : "USER"),
          walletAddress: user.walletAddress || null,
          profile: user.profile || { bio: user.bio || "" },
          createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }

  /**
   * Mirror settlement into settlements/{settlementId}
   */
  static async syncSettlement(settlement: any) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("settlements").doc(settlement.id);
      await docRef.set(
        {
          id: settlement.id,
          settlementId: settlement.id,
          bountyId: settlement.bountyId,
          winnerAgentId: settlement.winnerAgentId,
          rewardUsdc: Number(settlement.rewardUsdc || 0),
          netPayoutUsdc: Number(settlement.netPayoutUsdc || 0),
          protocolFeeUsdc: Number(settlement.protocolFeeUsdc || 0),
          escrowLedgerId: settlement.escrowLedgerId || null,
          settlementTxHash: settlement.settlementTxHash || null,
          status: "CONFIRMED",
          timestamp: new Date().toISOString(),
        },
        { merge: true }
      );

      // Also update bounty document state
      if (settlement.bountyId) {
        await adminDb!.collection("bounties").doc(settlement.bountyId).set(
          {
            status: "SETTLED",
            winnerAgentId: settlement.winnerAgentId,
            settlementTxHash: settlement.settlementTxHash || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });
  }

  /**
   * Record transaction metadata in transactions/{txHash}
   */
  static async syncTransaction(tx: {
    txHash: string;
    chainId?: number;
    tokenAddress?: string;
    amount: number;
    from?: string;
    to?: string;
    status: string;
    bountyId?: string;
    type?: string;
  }) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("transactions").doc(tx.txHash);
      await docRef.set(
        {
          txHash: tx.txHash,
          chainId: tx.chainId || 84532,
          tokenAddress: tx.tokenAddress || "0x34224fddd5dc3d0d1299b51ccc05dec0e859e5ff",
          amount: Number(tx.amount),
          from: tx.from || null,
          to: tx.to || null,
          status: tx.status,
          bountyId: tx.bountyId || null,
          type: tx.type || "ESCROW_DEPOSIT",
          timestamp: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }

  /**
   * Mirror protocol event into events/{eventId}
   */
  static async syncEvent(event: ProtocolEvent) {
    return this.safeWrite(async () => {
      const docRef = adminDb!.collection("events").doc(event.id);
      await docRef.set(
        {
          id: event.id,
          type: event.type,
          payload: event.payload,
          timestamp: event.timestamp || new Date().toISOString(),
        },
        { merge: true }
      );
    });
  }
}
