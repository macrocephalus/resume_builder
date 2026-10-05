# The frontend polls a lightweight statuses endpoint; no push channel

While any CV is in progress, the frontend asks `GET /api/cvs/statuses?ids=…` every 3 s and stops
when none is. One cheap request survives flaky mobile connections and page reloads with zero
reconnection logic, and the full CV is fetched only when a status leaves the in-progress group.

## Considered Options

- **Server-Sent Events / WebSocket** — need reconnection logic for reloads and dropped mobile
  connections.
