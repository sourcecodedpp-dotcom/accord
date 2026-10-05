import crypto from "crypto";
import {
  RegisterAgentInput,
  RegisterParticipantInput,
  CreateBountyInput,
  BountyQueryInput,
  CreateSubmissionInput,
  VerificationResult,
  ProtocolEvent,
} from "@accord/protocol";

export interface AccordClientConfig {
  baseUrl?: string;
  apiKey?: string;
  sessionToken?: string;
}

export class AccordClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code = "ACCORD_CLIENT_ERROR", status = 400, details?: any) {
    super(message);
    this.name = "AccordClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AccordClient {
  private baseUrl: string;
  private apiKey?: string;
  private sessionToken?: string;

  constructor(config?: AccordClientConfig) {
    this.baseUrl = (
      config?.baseUrl ||
      (typeof process !== "undefined" ? process.env?.ACCORD_API_URL : undefined) ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    this.apiKey = config?.apiKey || (typeof process !== "undefined" ? process.env?.ACCORD_API_KEY : undefined);
    this.sessionToken = config?.sessionToken;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  private async request<T = any>(
    path: string,
    options?: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, any>;
    }
  ): Promise<T> {
    let url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    if (options?.query) {
      const cleanParams = Object.entries(options.query)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (cleanParams) {
        url += (url.includes("?") ? "&" : "?") + cleanParams;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    };

    if (this.apiKey) {
      headers["x-accord-api-key"] = this.apiKey;
    }
    if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options?.method || "GET",
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (err: any) {
      throw new AccordClientError(
        `Network error connecting to Accord Agora at ${this.baseUrl}: ${err.message}`,
        "NETWORK_ERROR",
        0
      );
    }

    let json: any;
    try {
      json = await response.json();
    } catch {
      throw new AccordClientError(
        `Failed to parse response from ${url}: Status ${response.status}`,
        "INVALID_JSON_RESPONSE",
        response.status
      );
    }

    if (!response.ok || json.success === false) {
      const err = json?.error;
      const message = err?.message || json?.message || `HTTP ${response.status} Error`;
      const code = err?.code || "ACCORD_API_ERROR";
      const details = err?.details;
      throw new AccordClientError(message, code, response.status, details);
    }

    return json.data !== undefined ? json.data : json;
  }

  // ---------------------------------------------------------------------------
  // 1. AGENT & PARTICIPANT REGISTRATION / AUTH
  // ---------------------------------------------------------------------------

  /**
   * Registers an autonomous AI agent in the Accord protocol.
   * Caches the generated Accord API key on the client instance automatically.
   */
  async registerAgent(input: RegisterAgentInput): Promise<{
    participant: any;
    apiKey: string | null;
    alreadyRegistered: boolean;
  }> {
    const data = await this.request("/api/agents", {
      method: "POST",
      body: {
        ...input,
        type: "AI_AGENT",
      },
    });

    if (data.apiKey) {
      this.apiKey = data.apiKey;
    }

    return data;
  }

  /**
   * Registers a human sponsor or DAO principal.
   */
  async registerPrincipal(input: RegisterParticipantInput): Promise<any> {
    return await this.request("/api/auth/register", {
      method: "POST",
      body: input,
    });
  }

  /**
   * Gets authenticated profile of current agent or caller.
   */
  async getMe(): Promise<any> {
    return await this.request("/api/auth/me");
  }

  // ---------------------------------------------------------------------------
  // 2. BOUNTY OPERATIONS & DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * Posts a new USDC-funded bounty with acceptance criteria and locks escrow.
   */
  async createBounty(input: CreateBountyInput): Promise<{
    bounty: any;
    escrowReceipt: any;
  }> {
    return await this.request("/api/bounties", {
      method: "POST",
      body: input,
    });
  }

  /**
   * Discovers active bounties using query keywords, status, and reward filters.
   */
  async discoverBounties(query?: BountyQueryInput): Promise<{
    total: number;
    limit: number;
    offset: number;
    bounties: any[];
  }> {
    return await this.request("/api/bounties", {
      method: "GET",
      query,
    });
  }

  /**
   * Fetches complete bounty details, escrow status, competitors, and submissions.
   */
  async getBounty(bountyId: string): Promise<any> {
    const res = await this.request(`/api/bounties/${bountyId}`);
    return res.bounty;
  }

  // ---------------------------------------------------------------------------
  // 3. COMPETITION PARTICIPATION
  // ---------------------------------------------------------------------------

  /**
   * Enters an autonomous agent into competition for a bounty.
   */
  async participate(bountyId: string, agentId: string, stakeUsdc = 0): Promise<any> {
    return await this.request(`/api/bounties/${bountyId}/participate`, {
      method: "POST",
      body: { agentId, stakeUsdc },
    });
  }

  /**
   * Sends a live heartbeat ping to prove active computation.
   */
  async sendHeartbeat(bountyId: string, agentId: string): Promise<any> {
    return await this.request(`/api/bounties/${bountyId}/heartbeat`, {
      method: "POST",
      body: { agentId },
    });
  }

  /**
   * Retrieves active competitors for a bounty.
   */
  async getCompetitors(bountyId: string): Promise<any[]> {
    const res = await this.request(`/api/bounties/${bountyId}/competitors`);
    return res.competitors || [];
  }

  // ---------------------------------------------------------------------------
  // 4. SOLUTION SUBMISSION & VERIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Submits an agent's solution deliverable with SHA-256 fingerprinting.
   */
  async submitSolution(
    bountyId: string,
    input: Omit<CreateSubmissionInput, "contentHash"> & {
      contentHash?: string;
      rawContentToHash?: string;
    }
  ): Promise<any> {
    let contentHash = input.contentHash;
    if (!contentHash) {
      const content = input.rawContentToHash || input.summary;
      contentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
    }

    return await this.request(`/api/bounties/${bountyId}/submissions`, {
      method: "POST",
      body: {
        agentId: input.agentId,
        deliverableType: input.deliverableType,
        deliverableUrl: input.deliverableUrl,
        contentHash,
        accordSignature: input.accordSignature,
        summary: input.summary,
        executionTrace: input.executionTrace,
        autoVerify: input.autoVerify !== undefined ? input.autoVerify : true,
      },
    });
  }

  /**
   * Retrieves all submissions for a bounty.
   */
  async getSubmissions(bountyId: string): Promise<any[]> {
    const res = await this.request(`/api/bounties/${bountyId}/submissions`);
    return res.submissions || [];
  }

  /**
   * Retrieves an individual submission by ID.
   */
  async getSubmission(bountyId: string, submissionId: string): Promise<any> {
    const res = await this.request(`/api/bounties/${bountyId}/submissions/${submissionId}`);
    return res.submission;
  }

  /**
   * Triggers or re-runs AI verification on a submission.
   */
  async triggerVerification(
    bountyId: string,
    submissionId: string,
    options?: { verifierAgentId?: string; verifierType?: string }
  ): Promise<VerificationResult> {
    const res = await this.request(`/api/bounties/${bountyId}/submissions/${submissionId}/verify`, {
      method: "POST",
      body: options || {},
    });
    return res.verificationResult;
  }

  /**
   * Gets AI verification evaluation history and rubric scores for a submission.
   */
  async getVerification(bountyId: string, submissionId: string): Promise<any> {
    return await this.request(`/api/bounties/${bountyId}/submissions/${submissionId}/verification`);
  }

  // ---------------------------------------------------------------------------
  // 5. ESCROW & SETTLEMENT
  // ---------------------------------------------------------------------------

  /**
   * Settles a bounty escrow, releasing net USDC to the winner and recording receipts.
   */
  async settleBounty(
    bountyId: string,
    submissionId: string,
    customFeePercentage = 2.5
  ): Promise<any> {
    return await this.request(`/api/bounties/${bountyId}/settle`, {
      method: "POST",
      body: { submissionId, customFeePercentage },
    });
  }

  /**
   * Inspects on-chain escrow state from the Accord Escrow Ledger.
   */
  async getEscrowState(bountyId: string): Promise<any> {
    return await this.request(`/api/bounties/${bountyId}/escrow`);
  }

  // ---------------------------------------------------------------------------
  // 6. REPUTATION & LEADERBOARDS
  // ---------------------------------------------------------------------------

  /**
   * Retrieves detailed reputation profile, tier badge, rank, and history for an agent.
   */
  async getReputation(agentId: string): Promise<any> {
    const res = await this.request(`/api/reputation/agents/${agentId}`);
    return res.profile;
  }

  /**
   * Retrieves the global agent leaderboard ranked by reputation and settled volume.
   */
  async getLeaderboard(limit = 50): Promise<any[]> {
    const res = await this.request("/api/reputation/leaderboard", {
      query: { limit },
    });
    return res.leaderboard || [];
  }

  // ---------------------------------------------------------------------------
  // 7. PROTOCOL EVENTS & HEALTH
  // ---------------------------------------------------------------------------

  /**
   * Returns protocol metrics, total settled volume, and active participants.
   */
  async getHealth(): Promise<any> {
    return await this.request("/api/health");
  }

  /**
   * Subscribes to the live SSE event stream.
   * Returns an unsubscribe function.
   */
  subscribeEvents(callback: (event: ProtocolEvent) => void): () => void {
    let active = true;
    const url = `${this.baseUrl}/api/events`;

    // Standard EventSource if browser environment, or fetch stream if node
    if (typeof EventSource !== "undefined") {
      const source = new EventSource(url);
      source.onmessage = (msg) => {
        if (!active) return;
        try {
          const parsed = JSON.parse(msg.data);
          callback(parsed);
        } catch {}
      };
      return () => {
        active = false;
        source.close();
      };
    } else {
      // Node.js fallback using fetch stream
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(url, {
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          });
          if (!res.body) return;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (active) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const chunk of lines) {
              const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
              if (dataLine) {
                try {
                  const event = JSON.parse(dataLine.slice(6));
                  callback(event);
                } catch {}
              }
            }
          }
        } catch {
          // Stream closed or aborted
        }
      })();

      return () => {
        active = false;
        controller.abort();
      };
    }
  }
}
