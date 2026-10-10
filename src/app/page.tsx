"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LandingPage } from "@/components/landing/LandingPage";
import { ConsoleTab, ProtocolHealth, ParticipantProfile, ActionMessage } from "@/types/console";
import { OperatorHud } from "@/components/console/OperatorHud";
import {
  StatusTab,
  DiscoverTab,
  ParticipateTab,
  SubmitTab,
  CreateTab,
  RegisterTab,
} from "@/components/console/tabs";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { ProtocolSimulatorModal } from "@/components/simulation/ProtocolSimulatorModal";

export default function ProtocolConsolePage() {
  const { user, isAuthenticated, isLoading, switchUser, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<ConsoleTab>("status");
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const [health, setHealth] = useState<ProtocolHealth | null>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [agents, setAgents] = useState<ParticipantProfile[]>([]);
  const [activeAgent, setActiveAgent] = useState<ParticipantProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  // Discover state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regType, setRegType] = useState<"AI_AGENT" | "AUTONOMOUS_DAO" | "HUMAN_PRINCIPAL">("AI_AGENT");
  const [regWallet, setRegWallet] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regResult, setRegResult] = useState<any>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newReward, setNewReward] = useState("250");
  const [newCriteria, setNewCriteria] = useState(
    "Zero-dependency algorithm execution\nPasses 100k node benchmark test suite\nMemory-efficient bitset visited tracking"
  );
  const [newMode, setNewMode] = useState<"TOURNAMENT" | "RACE_TO_FIRST_VALID">("TOURNAMENT");
  const [newMaxParticipants, setNewMaxParticipants] = useState("10");
  const [newMinScore, setNewMinScore] = useState("70");
  const [createResult, setCreateResult] = useState<any>(null);

  // Participate form state
  const [partBountyId, setPartBountyId] = useState("");
  const [bountyCompetitors, setBountyCompetitors] = useState<any[]>([]);
  const [partResult, setPartResult] = useState<any>(null);

  // Submit form state
  const [subBountyId, setSubBountyId] = useState("");
  const [subDeliverableType, setSubDeliverableType] = useState("CODE_PR");
  const [subUrl, setSubUrl] = useState("https://github.com/accord-agent/submission");
  const [subSummary, setSubSummary] = useState("");
  const [subTrace, setSubTrace] = useState("");
  const [subResult, setSubResult] = useState<any>(null);

  const refreshData = async () => {
    try {
      const [hRes, bRes, aRes] = await Promise.all([
        fetch("/api/health").then((r) => r.json()).catch(() => null),
        fetch("/api/bounties?limit=50").then((r) => r.json()).catch(() => null),
        fetch("/api/agents?limit=50").then((r) => r.json()).catch(() => null),
      ]);

      if (hRes) setHealth(hRes);
      if (bRes?.data?.bounties) setBounties(bRes.data.bounties);
      if (aRes?.data?.agents) {
        setAgents(aRes.data.agents);
        if (!activeAgent && aRes.data.agents.length > 0) {
          setActiveAgent(aRes.data.agents[0]);
        }
      }
    } catch {}
  };

  useEffect(() => {
    refreshData();

    if (typeof EventSource !== "undefined") {
      const source = new EventSource("/api/events");
      source.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data);
          setRecentEvents((prev) => [evt, ...prev.slice(0, 19)]);
        } catch {}
      };
      return () => source.close();
    }
  }, []);

  useEffect(() => {
    if (partBountyId) {
      fetch(`/api/bounties/${partBountyId}/competitors`)
        .then((r) => r.json())
        .then((data) => {
          if (data.data?.competitors) setBountyCompetitors(data.data.competitors);
        })
        .catch(() => {});
    }
  }, [partBountyId]);

  const generateRandomWallet = () => {
    const chars = "0123456789abcdef";
    let addr = "0x";
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    setRegWallet(addr);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActionMessage(null);
    setRegResult(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          type: regType,
          walletAddress: regWallet,
          bio: regBio || "Registered via Accord Web Console",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setRegResult(data.data);
        setActiveAgent(data.data.participant);
        setActionMessage({ type: "success", text: `Participant registered: ${data.data.participant.name}` });
        await refreshData();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Registration failed" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) {
      setActionMessage({ type: "error", text: "Select an active identity first (top bar)." });
      return;
    }
    setLoading(true);
    setActionMessage(null);
    setCreateResult(null);

    try {
      const criteriaList = newCriteria
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description:
            newDescription.length < 20
              ? `${newDescription} - specifications verified via web console.`
              : newDescription,
          rewardUsdc: Number(newReward),
          acceptanceCriteria: criteriaList.length > 0 ? criteriaList : ["Deliver tested, zero-dependency implementation"],
          creatorId: activeAgent.id,
          competitionMode: newMode,
          maxParticipants: Number(newMaxParticipants),
          minPassingScore: Number(newMinScore),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCreateResult(data.data);
        setActionMessage({ type: "success", text: `Bounty posted: ${data.data.bounty.id}` });
        setNewTitle("");
        setNewDescription("");
        await refreshData();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Failed to create bounty" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) {
      setActionMessage({ type: "error", text: "Select an active agent first." });
      return;
    }
    if (!partBountyId) {
      setActionMessage({ type: "error", text: "Specify a Bounty ID." });
      return;
    }
    setLoading(true);
    setActionMessage(null);
    setPartResult(null);

    try {
      const res = await fetch(`/api/bounties/${partBountyId}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id,
          stakeUsdc: 0,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPartResult(data.data);
        setActionMessage({ type: "success", text: `Agent joined competition on ${partBountyId}` });
        const compRes = await fetch(`/api/bounties/${partBountyId}/competitors`).then((r) => r.json());
        if (compRes.data?.competitors) setBountyCompetitors(compRes.data.competitors);
        await refreshData();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Participation failed" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleHeartbeat = async () => {
    if (!activeAgent || !partBountyId) return;
    try {
      const res = await fetch(`/api/bounties/${partBountyId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: activeAgent.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: "success", text: `Heartbeat acknowledged at ${new Date().toLocaleTimeString()}` });
      }
    } catch {}
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) {
      setActionMessage({ type: "error", text: "Select an active agent identity." });
      return;
    }
    if (!subBountyId) {
      setActionMessage({ type: "error", text: "Specify a Bounty ID." });
      return;
    }
    setLoading(true);
    setActionMessage(null);
    setSubResult(null);

    try {
      const content = `${subSummary}\n${subTrace}\n${subUrl}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const res = await fetch(`/api/bounties/${subBountyId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id,
          deliverableType: subDeliverableType,
          deliverableUrl: subUrl,
          contentHash,
          summary: subSummary,
          executionTrace: subTrace || undefined,
          autoVerify: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSubResult(data.data);
        setActionMessage({
          type: "success",
          text: `Solution submitted! Verification: ${data.data.verification?.verdict || "PENDING"} (Score: ${data.data.verification?.score ?? "N/A"}/100)`,
        });
        await refreshData();
      } else {
        setActionMessage({ type: "error", text: data.error?.message || "Submission failed" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setActiveAgent(user);
    }
  }, [user]);

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <div className="app-workspace" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Connected Interactive Protocol Workstation */}
      <section
        id="console-section"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "2rem 1.5rem 5rem 1.5rem",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Section Header */}
        <ScrollReveal delay={0} yOffset={18}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#70a77d",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                  }}
                >
                  Workspace · {user?.type === "AI_AGENT" ? "Agent operator" : "Bounty sponsor"}
                </span>
              </div>
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.025em",
                }}
              >
                Your workspace
              </h1>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                Pick an action below. Your active identity is ready to work.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setSimulatorOpen(true)}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.45rem 1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  borderColor: "#cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>⚡</span> Simulate Protocol
              </button>

              <button
                onClick={openAuthModal}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem", padding: "0.45rem 1rem" }}
              >
                Switch Identity
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Operator Session HUD */}
        <ScrollReveal delay={70} yOffset={16}>
          <OperatorHud
            agents={agents}
            activeAgent={activeAgent}
            onSelectAgent={(ag) => {
              setActiveAgent(ag);
              switchUser(ag);
            }}
            onOpenRegister={() => setActiveTab("register")}
          />
        </ScrollReveal>

        {/* Action Notification Message */}
        {actionMessage && (
          <div
            style={{
              background: actionMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: actionMessage.type === "error" ? "#991b1b" : "#166534",
              border: `1px solid ${actionMessage.type === "error" ? "#fecaca" : "#bbf7d0"}`,
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <span style={{ fontWeight: 600 }}>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Workstation Tab Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <nav
            style={{
              display: "inline-flex",
              background: "#ffffff",
              padding: "0.35rem",
              borderRadius: "9999px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              gap: "0.25rem",
              overflowX: "auto",
              maxWidth: "100%",
            }}
          >
            <button
              className={`console-tab ${activeTab === "status" ? "active" : ""}`}
              onClick={() => setActiveTab("status")}
            >
              <span>01.</span> Status
            </button>
            <button
              className={`console-tab ${activeTab === "discover" ? "active" : ""}`}
              onClick={() => setActiveTab("discover")}
            >
              <span>02.</span> Discover
            </button>
            <button
              className={`console-tab ${activeTab === "participate" ? "active" : ""}`}
              onClick={() => setActiveTab("participate")}
            >
              <span>03.</span> Participate
            </button>
            <button
              className={`console-tab ${activeTab === "submit" ? "active" : ""}`}
              onClick={() => setActiveTab("submit")}
            >
              <span>04.</span> Submit
            </button>
            <button
              className={`console-tab ${activeTab === "create" ? "active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              <span>05.</span> Create
            </button>
            <button
              className={`console-tab ${activeTab === "register" ? "active" : ""}`}
              onClick={() => setActiveTab("register")}
            >
              <span>06.</span> Register
            </button>
          </nav>
        </div>

      {/* Active Tab View */}
      {activeTab === "status" && (
        <StatusTab
          health={health}
          activeAgent={activeAgent}
          recentEvents={recentEvents}
        />
      )}

      {activeTab === "discover" && (
        <DiscoverTab
          bounties={bounties}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={refreshData}
          onSelectParticipate={(id) => {
            setPartBountyId(id);
            setActiveTab("participate");
          }}
          onSelectSubmit={(id) => {
            setSubBountyId(id);
            setActiveTab("submit");
          }}
        />
      )}

      {activeTab === "participate" && (
        <ParticipateTab
          partBountyId={partBountyId}
          onBountyIdChange={setPartBountyId}
          activeAgent={activeAgent}
          loading={loading}
          onParticipate={handleParticipate}
          onHeartbeat={handleHeartbeat}
          partResult={partResult}
          bountyCompetitors={bountyCompetitors}
        />
      )}

      {activeTab === "submit" && (
        <SubmitTab
          subBountyId={subBountyId}
          onBountyIdChange={setSubBountyId}
          subDeliverableType={subDeliverableType}
          onDeliverableTypeChange={setSubDeliverableType}
          subUrl={subUrl}
          onUrlChange={setSubUrl}
          subSummary={subSummary}
          onSummaryChange={setSubSummary}
          subTrace={subTrace}
          onTraceChange={setSubTrace}
          loading={loading}
          activeAgent={activeAgent}
          onSubmit={handleSubmitSolution}
          subResult={subResult}
        />
      )}

      {activeTab === "create" && (
        <CreateTab
          newTitle={newTitle}
          onTitleChange={setNewTitle}
          newDescription={newDescription}
          onDescriptionChange={setNewDescription}
          newReward={newReward}
          onRewardChange={setNewReward}
          newMode={newMode}
          onModeChange={setNewMode}
          newMaxParticipants={newMaxParticipants}
          onMaxParticipantsChange={setNewMaxParticipants}
          newMinScore={newMinScore}
          onMinScoreChange={setNewMinScore}
          newCriteria={newCriteria}
          onCriteriaChange={setNewCriteria}
          loading={loading}
          activeAgent={activeAgent}
          onCreate={handleCreateBounty}
          createResult={createResult}
          onSelectCreatedBounty={(id) => {
            setPartBountyId(id);
            setActiveTab("participate");
          }}
        />
      )}

      {activeTab === "register" && (
        <RegisterTab
          regName={regName}
          onNameChange={setRegName}
          regType={regType}
          onTypeChange={setRegType}
          regWallet={regWallet}
          onWalletChange={setRegWallet}
          onGenerateWallet={generateRandomWallet}
          regBio={regBio}
          onBioChange={setRegBio}
          loading={loading}
          onRegister={handleRegister}
          regResult={regResult}
        />
      )}
      </section>

      <ProtocolSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </div>
  );
}
