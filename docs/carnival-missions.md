# Carnival Missions — Developer Guide

This document describes two new host methods exposed by the Startale App for the upcoming **Carnival campaign**:

- `startale.getMissionStatus()` — read the current mission state for the connected user.
- `startale.completeMission()` — mark the mission as completed for the connected user.

Both methods are available on the Startale App host and can be invoked from any Mini App running inside Startale App.

## Availability

- **Preview**: Both methods are callable from the Startale **developer preview page** right now. This is the intended surface for integration and testing **until the Carnival campaign goes live**.
- **Production**: Once the Carnival campaign starts, the methods will be available to end users running the Mini App inside Startale App.

During preview, you can drive both methods from a dev build of the Mini App and inspect the responses without waiting for the campaign launch.

## API Reference

The methods are exposed on the Startale namespace of the Mini App host. They are not part of the standard `@farcaster/miniapp-sdk` surface — they live under `miniAppHost.startale`.

### `getMissionStatus()`

Returns the current mission status for the connected user. A fresh user who has not yet interacted with the campaign receives a zeroed record (`completed: false`, `amountAwarded: 0`, `timesProgressed: 0`, `completedAt` absent) — not `null`. The `null` return is reserved for the edge case where the host has no miniapp id bound; this does not happen in Startale App production or developer-preview flows, so miniapps running inside Startale App always receive a record.

**Signature**

```ts
getMissionStatus(): Promise<MissionStatus>
```

**Return type**

```ts
type MissionStatus = {
  completed: boolean;       // true once the mission has been completed
  amountAwarded: number;    // points awarded from this mission
  completedAt?: string;     // ISO timestamp, present when completed === true
  timesProgressed: number;  // number of progress events recorded so far
} | null;
```

**Example response**

```json
{
  "completed": false,
  "amountAwarded": 0,
  "timesProgressed": 3
}
```

After completion:

```json
{
  "completed": true,
  "amountAwarded": 500,
  "completedAt": "2026-04-22T10:14:00.000Z",
  "timesProgressed": 5
}
```

### `completeMission()`

Marks the mission as completed for the connected user. Retry behaviour is backend-dependent: a second call on an already-completed mission may resolve with `{ success: true }` again, or the promise may reject with an "already completed" message from the backend. Treat either outcome as a successful prior completion.

**Signature**

```ts
completeMission(): Promise<{ success: boolean }>
```

**Return value**

```json
{ "success": true }
```

On failure the promise rejects — handle errors with `try / catch`.

## Integration

### Thin wrapper

Because these methods are Startale-specific and not typed in `@farcaster/miniapp-sdk`, cast the host once in a small module and re-export typed helpers. The reference implementation lives at `src/startale.ts`:

```ts
// src/startale.ts
import { miniAppHost } from "@farcaster/miniapp-sdk";

export type MissionStatus = {
  completed: boolean;
  amountAwarded: number;
  completedAt?: string;
  timesProgressed: number;
} | null;

type StartaleNamespace = {
  startale: {
    getMissionStatus: () => Promise<MissionStatus>;
    completeMission: () => Promise<{ success: boolean }>;
  };
};

const host = miniAppHost as unknown as StartaleNamespace;

export const getMissionStatus = () => host.startale.getMissionStatus();
export const completeMission = () => host.startale.completeMission();
```

Consumers then import from the wrapper, not from the host directly:

```ts
import { completeMission, getMissionStatus, type MissionStatus } from "./startale";
```

### Usage example

Minimal React example (see `MissionsSection` in `src/App.tsx` for the full reference UI):

```tsx
import { useState } from "react";
import { completeMission, getMissionStatus, type MissionStatus } from "./startale";

function Missions() {
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setStatus(await getMissionStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const complete = async () => {
    try {
      await completeMission();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <button onClick={refresh}>Get status</button>
      <button onClick={complete}>Complete mission</button>
      {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </>
  );
}
```

## Testing from the Developer Preview Page

Until the Carnival campaign launches, exercise the integration through Startale App's developer preview:

1. Run the Mini App locally (or deploy a preview URL).
2. Load the Mini App inside the Startale App **developer preview** page.
3. Call `getMissionStatus()` — for a fresh user you should see a zeroed record (`completed: false`, `amountAwarded: 0`, `timesProgressed: 0`, `completedAt` absent).
4. Call `completeMission()` — it should resolve with `{ success: true }`.
5. Call `getMissionStatus()` again — `completed` should now be `true` and `completedAt` populated.

The in-app reference UI for this flow is the **Missions** section in the wallet-connected view (see `MissionsSection` at `src/App.tsx:245`).

## Notes & Caveats

- **Host scope**: These methods only exist on the Startale App host. Calls from other Farcaster clients (Warpcast, etc.) will reject because `miniAppHost.startale` is undefined there. Gate the UI with a host/capability check if your Mini App ships to multiple clients.
- **User binding**: Mission state is scoped to the connected Startale App user; there is no user parameter on either method.
- **Error handling**: Both methods return promises — always wrap calls in `try / catch` and surface failures to the UI. The host may reject if the user is not authenticated, the campaign is not active, or the method is not supported by the running host version.
- **Points semantics**: `amountAwarded` reflects mission-specific points and is distinct from the user's global STAR point balance exposed via `sdk.context.startale.starPoints`.
- **Retries**: `completeMission()` can be safely retried on transient errors. Once the mission is already completed, a retry may resolve with `{ success: true }` or reject with an "already completed" message — both indicate success; handle the rejection defensively.
