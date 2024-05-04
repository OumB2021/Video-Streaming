import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { nanoid } from "nanoid";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const clients = new Map<string, WSContext>();

const offerQueue = new Map<string, RTCSessionDescriptionInit>();
const iceQueue = new Map<string, RTCIceCandidateInit[]>();

const app = new Hono().basePath("/api");

app.get("/test", (c) => {
  return c.text("Hello from the server!");
});

app.get(
  "/ws",
  upgradeWebSocket(() => {
    const id = nanoid();

    return {
      onOpen: (ev, ws) => {
        console.log(`${id}: WebSocket connection opened`);
        clients.set(id, ws);
        ws.send(
          JSON.stringify({
            src: "server",
            type: "id",
            payload: id,
          }),
        );
        for (const [clientId, offer] of offerQueue.entries()) {
          if (id === clientId) continue;
          console.log(`${id}:     Sending queued offer from ${clientId}`);
          ws.send(JSON.stringify(offer));
        }
        for (const [clientId, ices] of iceQueue.entries()) {
          if (id === clientId) continue;
          console.log(
            `${id}:     Sending queued ICE candidates from ${clientId}`,
          );
          for (const ice of ices) {
            ws.send(
              JSON.stringify({
                src: clientId,
                type: "iceCandidate",
                payload: ice,
              }),
            );
          }
        }
      },
      onMessage: (e) => {
        console.log(`${id}: WebSocket message received:`, e.data);
        const data = JSON.parse(e.data.toString());
        if (data.type === "offer") {
          offerQueue.set(id, data);
          return;
        }
        if (data.type === "iceCandidate") {
          if (!iceQueue.has(id)) {
            iceQueue.set(id, []);
          }
          iceQueue.get(id)!.push(data.payload);
          return;
        }
        for (const [clientId, client] of clients.entries()) {
          if (id === clientId) continue;
          console.log(`${id}:     Forwarding message to ${clientId}`);
          client.send(JSON.stringify(data));
        }
      },
      onClose: (ws) => {
        console.log(`${id}: WebSocket connection closed`);
        clients.delete(id);
        offerQueue.delete(id);
        iceQueue.delete(id);
      },
    };
  }),
);

const port = 3001;
console.log(`Server is running on port ${port}`);

Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: app.fetch,
  websocket,
});
