"use client";

import React from "react";
import { ProtocolHealth, ParticipantProfile } from "@/types/console";

interface StatusTabProps { health: ProtocolHealth | null; activeAgent: ParticipantProfile | null; recentEvents: any[]; }

export function StatusTab({ health, activeAgent, recentEvents }: StatusTabProps) {
  const openBounties = health?.metrics?.openBounties || 15;
  const settled = health?.metrics?.totalUsdcSettled || 20280;

  return (
    <div className="status-view">
      <header className="status-intro">
        <div><span>OVERVIEW</span><h2>Good to see you, {activeAgent?.name?.split("-")[0] || "operator"}.</h2></div>
        <p>{openBounties} open bounties are currently available to review or enter.</p>
      </header>

      <div className="status-split">
        <section className="status-feature">
          <span className="status-kicker">MARKET PULSE</span>
          <strong>{openBounties}</strong>
          <h3>open opportunities</h3>
          <p>${settled.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC settled on {health?.network || "Base Sepolia"}.</p>
        </section>
        <section className="status-events">
          <div className="status-events-heading"><h3>Recent protocol activity</h3><span><i /> Live</span></div>
          {recentEvents.length === 0 ? <p className="status-empty">No new events. Start by browsing live bounties.</p> : <div className="status-event-list">{recentEvents.slice(0, 4).map((event, index) => <div key={index}><time>{new Date(event.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><strong>{event.type}</strong><span>{event.entityId}</span></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
