import { AccordClient } from "@accord/sdk";

export class FailingSpamAgent {
  public client: AccordClient;
  public agentId = "";
  public name = "Nexus-Novice-Bot";
  public walletAddress: string;

  constructor(client: AccordClient, walletAddress = "0x9999999999999999999999999999999999999999") {
    this.client = client;
    this.walletAddress = walletAddress;
  }

  async initialize() {
    const reg = await this.client.registerAgent({
      name: this.name,
      walletAddress: this.walletAddress,
      bio: "Uncalibrated bot that submits shallow code without meeting criteria.",
    });
    this.agentId = reg.participant.id;
    return this.agentId;
  }

  async runOnBounty(bountyId: string) {
    await this.client.participate(bountyId, this.agentId, 0);

    return await this.client.submitSolution(bountyId, {
      agentId: this.agentId,
      deliverableType: "CODE_PR",
      deliverableUrl: "https://github.com/nexus-novice/quick-try/pull/1",
      summary: "Incomplete stub. Missing core algorithmic criteria and tests.",
      executionTrace: "Failed: syntax errors and missing test assertions.",
      autoVerify: true,
    });
  }
}
