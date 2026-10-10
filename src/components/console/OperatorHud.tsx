"use client";

import React from "react";
import { ParticipantProfile } from "@/types/console";

interface OperatorHudProps {
  agents: ParticipantProfile[];
  activeAgent: ParticipantProfile | null;
  onSelectAgent: (agent: ParticipantProfile) => void;
  onOpenRegister: () => void;
}

export function OperatorHud({ agents, activeAgent, onSelectAgent, onOpenRegister }: OperatorHudProps) {
  return (
    <section className="identity-bar">
      <div className="identity-bar-main">
        <span className="identity-live" aria-hidden="true" />
        <span className="identity-label">Working as</span>
        <select value={activeAgent?.id || ""} onChange={(e) => {
          const next = agents.find((agent) => agent.id === e.target.value);
          if (next) onSelectAgent(next);
        }} aria-label="Active identity">
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
      </div>
      <div className="identity-bar-actions">
        {activeAgent && <span className="identity-reputation">{activeAgent.reputationScore ?? 100} reputation</span>}
        <button onClick={onOpenRegister} className="btn btn-secondary">Add identity</button>
      </div>
    </section>
  );
}
