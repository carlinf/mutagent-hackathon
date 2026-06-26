<!--
  MUTAGENT — Hackathon Quickstart
  Brand theme: black background · violet #7E47D7 (primary) · cyan #45b8cc (accent).
  (Markdown can't render color — a themed quickstart.html can be generated from this later.)
-->

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║  ███╗   ███╗ ██╗   ██╗ ████████╗  █████╗   ██████╗  ███████╗ ███╗   ██╗ ████████╗  ║
║  ████╗ ████║ ██║   ██║ ╚══██╔══╝ ██╔══██╗ ██╔════╝  ██╔════╝ ████╗  ██║ ╚══██╔══╝  ║
║  ██╔████╔██║ ██║   ██║    ██║    ███████║ ██║  ███╗ █████╗   ██╔██╗ ██║    ██║     ║
║  ██║╚██╔╝██║ ██║   ██║    ██║    ██╔══██║ ██║   ██║ ██╔══╝   ██║╚██╗██║    ██║     ║
║  ██║ ╚═╝ ██║ ╚██████╔╝    ██║    ██║  ██║ ╚██████╔╝ ███████╗ ██║ ╚████║    ██║     ║
║  ╚═╝     ╚═╝  ╚═════╝     ╚═╝    ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═══╝    ╚═╝     ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║  Agentic Development Lifecycle · Hackathon Quickstart                              ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

> Build an AI agent, prove it works, find out why it fails, and fix it — all from one
> conversational orchestrator. This guide gets you from clone to your first agent.

---

## 🏆 Hackathon Challenge

**Build & evaluate the most sophisticated AI agent you can** — end-to-end through the Mutagent framework, in any harness/framework (Mastra · LangGraph · Claude Code · Codex). Run `*spec → *build → *evaluate` and prove it works with a real eval set. The more ambitious and capable — real jobs, tools, integrations, triggers — the better.

🏆 **Bonus — Extend the Lifecycle:** add a new ADL stage / `*command` / skill that cleanly fits Helix.

**Judging Criteria**
1. **Sophistication of the agent** — ambition & complexity: jobs, tools, triggers, real integrations.
2. **Loop completeness** — `*spec → *build → *evaluate` end-to-end (`*diagnose → *improve` rounds count for more).
3. **Proof it works** — eval criteria + a real dataset (≥20 items) + a scorecard.
4. 🏆 **Framework extension** (bonus) — does your new command/stage work + fit the system?

**Delivery**
- **Agent code** left on the `mutagent-hackathon` codebase.
- **Orchestrator (Helix) + subagent session transcripts — required.** These *are* your submission — both framework feedback and proof you used the system.

---

## ① Quick Start — zero to orchestrator in 3 steps

```
┌ STEP 1 · CLONE ─────────────────────────────────────────────────────┐
│  $ git clone https://github.com/mutagent-io/mutagent-hackathon       │
│  $ cd mutagent-hackathon                                             │
└──────────────────────────────────────────────────────────────────────┘

┌ STEP 2 · INSTALL THE MUTAGENT SYSTEM ───────────────────────────────┐
│  $ bunx @mutagent/helix init        (or  npx / pnpx)                 │
│  → installs the agents + skills into  .claude/  and  .codex/         │
└──────────────────────────────────────────────────────────────────────┘

┌ STEP 3 · BOOT ──────────────────────────────────────────────────────┐
│  $ claude            (or  codex)                                     │
│  ❯ mutagent                                                         │
│  → the orchestrator boots: lifecycle · system map · what you can do  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ② How it works — one agent, five stages, you stay in control

```
┌──────────────────────────────────────────────────────────────────────┐
│   ①SPEC ─▶ ②BUILD ─▶ ③EVALUATE ─▶ ④DIAGNOSE ─▶ ⑤IMPROVE ──┐  ↺        │
│      ▲──────────────────────────────────────────────────────┘         │
│   Jump in at any stage. Nothing moves on without you saying so.       │
│                                                                       │
│   *spec       describe your agent  →  a spec file                     │
│   *build      turn the spec into a working agent                      │
│   *evaluate   check how good it is                                    │
│   *diagnose   find out why it failed                                  │
│   *improve    apply the fix, then re-check                            │
│                                                                       │
│   first time?   *onboard  → add your keys, pick your models           │
│   ⚑ each stage ends by telling you the next step and waiting for you  │
└──────────────────────────────────────────────────────────────────────┘
```

```
┌─💬 SAY ──────────────────────────────────────────────────────────────┐
│  "set me up with my Anthropic and GitHub keys"      → *onboard         │
│  "what agents and skills do we have?"               → *sync            │
│  "where are we in the lifecycle right now?"         → *status          │
└──────────────────────────────────────────────────────────────────────┘
```

### …and here's the boot you get

```
   ❯ mutagent

   🧬 MUTAGENT — Build · Evaluate · Diagnose · Improve
   ┌ LIFECYCLE ──────────────────────────────────────────────────┐
   │  ① SPEC → ② BUILD → ③ EVALUATE → ④ DIAGNOSE → ⑤ IMPROVE        │
   └──────────────────────────────────────────────────────────────┘
   ┌ WHAT YOU CAN DO ────────────────────────────────────────────┐
   │  *spec      design a new agent                               │
   │  *build     turn a spec into a working agent                 │
   │  *evaluate  check how good it is                             │
   │  *diagnose  find out why it failed                           │
   │  *onboard   add keys & pick models                           │
   └──────────────────────────────────────────────────────────────┘
   Type a *command — or just say what you want.
```

---

## ③ Spec — turn an idea into a working spec

```
┌ ③ SPEC ─────────────────────────────────────────────────────────────┐
│  A short guided interview captures WHAT your agent is, then writes    │
│  a spec file you can build from. You answer with quick pick-lists.    │
│                                                                       │
│  ❯ *spec                                                             │
│  🧬 What agent do you want to build?                                 │
│  ❯ A Mastra agent that triages our support inbox and                 │
│     drafts replies for an on-call engineer to approve.               │
│  🧬 ⟨pick-lists⟩  what kind? · how should it talk to Slack & GitHub?  │
│  ❯ ⟨taps options⟩                                                    │
│  🧬 wrote your spec ✓ — next: *build (I won't move on without you)    │
└──────────────────────────────────────────────────────────────────────┘

┌─💬 SAY ──────────────────────────────────────────────────────────────┐
│  "design a new agent that triages our support inbox"                  │
│  "spec out a research agent that benchmarks our models"               │
│  "I want to build an agent that reviews pull requests"                │
└──────────────────────────────────────────────────────────────────────┘

  📦 PRODUCES:  your agent spec  (agentspec.yaml)
```

---

## ④ Build — your spec becomes a real, working agent

```
┌ ④ BUILD ────────────────────────────────────────────────────────────┐
│  your spec ──▶ Mutagent picks up your chosen target                   │
│                (Mastra · LangGraph · a Claude/Codex agent)            │
│                reads that framework's latest docs                     │
│                writes the agent + tests, fixes until it all passes    │
│                uses the exact model you picked                        │
│                                                                       │
│  then a reviewer double-checks the result matches your spec —         │
│  every capability you asked for is actually there — before you move.  │
└──────────────────────────────────────────────────────────────────────┘

┌─💬 SAY ──────────────────────────────────────────────────────────────┐
│  "build the agent I just spec'd"                                      │
│  "implement my support-triage spec into Mastra"                       │
│  "generate the code for the support-triage agent"                     │
└──────────────────────────────────────────────────────────────────────┘

  📦 PRODUCES:  a working agent (the code)  +  a build report
```

---

## ⑤ Evaluate — four ways to know if your agent is good

```
┌ FIND NEW EVALS ─────────────────────────────────────────────────────┐
│  Looks at your agent's runs and suggests what's worth testing.        │
│  💬 "find evals for the PR-review agent from its recent runs"         │
│     "look at my support agent's sessions and tell me what to test"    │
│  📦 a list of suggested evals  +  a starter test set                  │
└──────────────────────────────────────────────────────────────────────┘
┌ EVALUATE IT ────────────────────────────────────────────────────────┐
│  Scores your agent's runs → a clear pass / fail per behavior.         │
│   · BUILT-IN: Mutagent judges it for you — no setup.                  │
│   · YOUR STACK: get a test-suite that runs in your project / CI       │
│     (uses your AI provider key).                                      │
│  💬 "evaluate the support-triage agent"                               │
│     "how good is my support agent on its last 50 conversations?"      │
│  📦 a scorecard (pass/fail per behavior)  [+ a test-suite, your-stack]│
└──────────────────────────────────────────────────────────────────────┘
┌ CREATE EVALS ───────────────────────────────────────────────────────┐
│  Build the checks yourself, guided, based on your spec.               │
│  💬 "create evals for the support-triage agent"                       │
│     "add an eval that checks it never sends a duplicate reply"        │
│  📦 your eval suite (the checks)                                      │
└──────────────────────────────────────────────────────────────────────┘
┌ MAKE A TEST SET ────────────────────────────────────────────────────┐
│  Turn a few examples into a realistic set of test cases.              │
│  💬 "make a test set for the support agent"                           │
│     "generate tricky test cases for the PR-review agent"               │
│  📦 a dataset of test cases                                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ⑥ Diagnose — when an eval fails, find out why

```
┌ ⑥ DIAGNOSE ─────────────────────────────────────────────────────────┐
│  Takes the failures from evaluate and works out the root cause —      │
│  what broke, where in the code, and a ranked list of fixes (★ = the   │
│  recommended one). It explains, it doesn't change anything yet.       │
└──────────────────────────────────────────────────────────────────────┘

┌─💬 SAY ──────────────────────────────────────────────────────────────┐
│  "why did the support agent fail its escalation eval?"                │
│  "what's wrong with my support agent's escalation flow?"              │
│  "diagnose the failures from the last evaluation run"                 │
└──────────────────────────────────────────────────────────────────────┘

  📦 PRODUCES:  a diagnosis report  (what broke · why · ranked fixes)
```

---

## ⑦ Improve — apply the fix, then re-check

```
┌ ⑦ IMPROVE ──────────────────────────────────────────────────────────┐
│  Hands the recommended fix to an AI engineer that edits your agent,   │
│  then re-runs evaluate. It loops — fix, re-check — until it passes.   │
│  Nothing changes without your go-ahead.                               │
└──────────────────────────────────────────────────────────────────────┘

┌─💬 SAY ──────────────────────────────────────────────────────────────┐
│  "apply the recommended fix to the support-triage agent"              │
│  "fix my support agent's duplicate-message bug and re-evaluate"       │
│  "make the support-triage agent pass its evals"                       │
└──────────────────────────────────────────────────────────────────────┘

  📦 PRODUCES:  the updated agent (applied fix)  +  a fresh scorecard
```

---

```
┌ TIPS ────────────────────────────────────────────────────────────────┐
│  • You can type a *command, or just say what you want — it routes.    │
│  • Evaluate needs your agent's runs. No runs yet? Ask Mutagent to     │
│    generate a few test runs so you can see a scorecard immediately.   │
│  • Use the exact model id your provider lists (a typo'd id will stop  │
│    the run rather than quietly swap models).                          │
└──────────────────────────────────────────────────────────────────────┘
```
