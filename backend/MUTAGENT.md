# Mutagent Notes

This backend was prepared for a multi-agent implementation. The project currently implements its agent workflows directly in TypeScript under `backend/src/agents`.

## Requested Command

The originally requested command was:

```bash
bunx @mutagent init
```

Bun rejects that form because scoped packages need a package name. The valid CLI package is `@mutagent/cli`, with binary `mutagent`.

## Correct Command Form

```bash
bunx -p @mutagent/cli mutagent init
```

## Authentication Requirement

During setup, Mutagent required authentication before initialization:

```text
Authentication required before init
Suggestion: Run: mutagent auth login --browser
```

After authentication, the expected sequence is:

```bash
bunx -p @mutagent/cli mutagent login --browser --json
bunx -p @mutagent/cli mutagent init --json
bunx -p @mutagent/cli mutagent workspaces list --json
bunx -p @mutagent/cli mutagent skills install --json
```

## Current Project Position

The working agent stack does not depend on Mutagent at runtime. The active implementation is:

```text
backend/src/agents/
  coordinator-agent.ts
  follow-up-operations-agent.ts
  what-if-forecast-agent.ts
  operations/
  forecast/
```

See [`../docs/AGENTIC_INFRASTRUCTURE.md`](../docs/AGENTIC_INFRASTRUCTURE.md) for the active architecture.
