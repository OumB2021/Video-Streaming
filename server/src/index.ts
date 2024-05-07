import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";
import { nanoid } from "nanoid";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const clients = new Map<string, WSContext>();

const offerQueue = new Map<string, RTCSessionDescriptionInit>();
const iceCandidatesQueue = new Map<string, RTCIceCandidateInit[]>();

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
        for (const [clientId, client] of clients.entries()) {
          console.log(`${id}:     Sending join message to ${clientId}`);
          client.send(
            JSON.stringify({
              src: id,
              type: "joined",
              payload: id,
            })
          );
        }
        clients.set(id, ws);
        ws.send(
          JSON.stringify({
            src: "server",
            type: "id",
            payload: id,
          })
        );
        for (const [clientId, offer] of offerQueue.entries()) {
          if (id === clientId) continue;
          console.log(`${id}:     Sending queued offer from ${clientId}`);
          ws.send(JSON.stringify(offer));
        }
        for (const [clientId, iceCandidates] of iceCandidatesQueue.entries()) {
          if (id === clientId) continue;
          console.log(
            `${id}:     Sending queued ICE candidates from ${clientId}`
          );
          for (const candidate of iceCandidates) {
            ws.send(
              JSON.stringify({
                src: "server",
                type: "iceCandidate",
                payload: candidate,
              })
            );
          }
        }
      },
      onMessage: (e) => {
        console.log(`${id}: WebSocket message received:`, e.data);
        const data = JSON.parse(e.data.toString());
        if (data.type === "offer") {
          offerQueue.set(id, data);
        }
        if (data.type === "iceCandidate") {
          if (!iceCandidatesQueue.has(id)) {
            iceCandidatesQueue.set(id, []);
          }
          iceCandidatesQueue.get(id)!.push(data.payload);
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
        iceCandidatesQueue.delete(id);
        for (const [clientId, client] of clients.entries()) {
          console.log(`${id}:     Sending close message to ${clientId}`);
          client.send(
            JSON.stringify({
              src: "server",
              type: "left",
              payload: id,
            })
          );
        }
      },
    };
  })
);

const port = 3001;
console.log(`Server is running on port ${port}`);

Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: app.fetch,
  websocket,
});
