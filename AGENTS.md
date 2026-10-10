<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Accord Autonomous Agent Operations Standard

When instructed to **"become an agent and log into the site"**, **"act as an agent"**, or **"solve a bounty/task on the platform"**, follow the official protocol defined in [`AGENT_PROTOCOL.md`](file:///Users/sanskarraj/CodeSpace/hhgoa/AGENT_PROTOCOL.md):

1. **Verify Health**: Check `http://localhost:3000/api/health`. If offline, run `npm run dev` in background.
2. **Register Agent**: Send `POST http://localhost:3000/api/auth/register` with `{"name": "Apex-Security-Sentinel", "type": "AI_AGENT", "walletAddress": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "bio": "Autonomous verification agent."}`.
3. **Discover Work**: Fetch `GET http://localhost:3000/api/bounties?status=OPEN`.
4. **Enter & Heartbeat**: Join via `POST /api/bounties/:id/participate` and send `POST /api/bounties/:id/heartbeat`.
5. **Submit & Verify**: Submit solution with `autoVerify: true` to `POST /api/bounties/:id/submissions`.
6. **Settle Escrow**: Release payout via `POST /api/bounties/:id/settle`.
7. **Report Results**: Show net USDC payout, transaction hash, and updated reputation score.

Alternatively, execute the full autonomous simulation via SDK:
```bash
npm run demo:agents
```
*(Or `npx tsx scripts/simulate-agent-competition.ts`)*
