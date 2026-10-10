"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  DocumentData,
} from "firebase/firestore";
import { db } from "./client";

/**
 * Realtime hook for a single bounty and its participants & submissions subcollections
 */
export function useRealtimeBounty(bountyId: string) {
  const [bounty, setBounty] = useState<DocumentData | null>(null);
  const [participants, setParticipants] = useState<DocumentData[]>([]);
  const [submissions, setSubsubmissions] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !bountyId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Bounty parent document listener
      const bountyDocRef = doc(db, "bounties", bountyId);
      const unsubBounty = onSnapshot(
        bountyDocRef,
        (snap) => {
          if (snap.exists()) {
            setBounty({ id: snap.id, ...snap.data() });
          }
          setLoading(false);
        },
        (err) => {
          console.warn("[Firestore] Bounty snapshot error:", err);
          setLoading(false);
        }
      );

      // 2. Participants subcollection listener
      const participantsRef = collection(db, "bounties", bountyId, "participants");
      const unsubParticipants = onSnapshot(
        participantsRef,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setParticipants(list);
        },
        (err) => console.warn("[Firestore] Participants snapshot error:", err)
      );

      // 3. Submissions subcollection listener
      const submissionsRef = collection(db, "bounties", bountyId, "submissions");
      const unsubSubmissions = onSnapshot(
        submissionsRef,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setSubsubmissions(list);
        },
        (err) => console.warn("[Firestore] Submissions snapshot error:", err)
      );

      return () => {
        unsubBounty();
        unsubParticipants();
        unsubSubmissions();
      };
    } catch (err) {
      console.warn("[Firestore] useRealtimeBounty failed:", err);
      setLoading(false);
    }
  }, [bountyId]);

  return { bounty, participants, submissions, loading };
}

/**
 * Realtime hook for the active bounties list
 */
export function useRealtimeBounties(limitCount = 50) {
  const [bounties, setBounties] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "bounties"), limit(limitCount));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setBounties(list);
          setLoading(false);
        },
        (err) => {
          console.warn("[Firestore] useRealtimeBounties snapshot error:", err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, [limitCount]);

  return { bounties, loading };
}

/**
 * Realtime hook for registered agents
 */
export function useRealtimeAgents(limitCount = 50) {
  const [agents, setAgents] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "agents"), limit(limitCount));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setAgents(list);
          setLoading(false);
        },
        (err) => {
          console.warn("[Firestore] useRealtimeAgents snapshot error:", err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, [limitCount]);

  return { agents, loading };
}

/**
 * Realtime hook for protocol telemetry events
 */
export function useRealtimeEvents(limitCount = 20) {
  const [events, setEvents] = useState<DocumentData[]>([]);

  useEffect(() => {
    if (!db) return;

    try {
      const q = query(
        collection(db, "events"),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setEvents(list);
        },
        (err) => console.warn("[Firestore] useRealtimeEvents snapshot error:", err)
      );
      return () => unsubscribe();
    } catch {}
  }, [limitCount]);

  return { events };
}

/**
 * Realtime hook for user account
 */
export function useRealtimeUser(userId?: string) {
  const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    try {
      const unsub = onSnapshot(
        doc(db, "users", userId),
        (snap) => {
          if (snap.exists()) {
            setUserProfile({ id: snap.id, ...snap.data() });
          }
          setLoading(false);
        },
        (err) => {
          console.warn("[Firestore] useRealtimeUser error:", err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch {
      setLoading(false);
    }
  }, [userId]);

  return { userProfile, loading };
}

/**
 * Realtime hook for wallet transactions
 */
export function useRealtimeTransactions(limitCount = 20) {
  const [transactions, setTransactions] = useState<DocumentData[]>([]);

  useEffect(() => {
    if (!db) return;

    try {
      const q = query(
        collection(db, "transactions"),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: DocumentData[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
          setTransactions(list);
        },
        (err) => console.warn("[Firestore] useRealtimeTransactions error:", err)
      );
      return () => unsub();
    } catch {}
  }, [limitCount]);

  return { transactions };
}
