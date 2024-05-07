export type SignalMessage =
  | { src: string; type: "answer"; payload: RTCSessionDescriptionInit }
  | { src: string; type: "offer"; payload: RTCSessionDescriptionInit }
  | { src: string; type: "iceCandidate"; payload: RTCIceCandidate }
  | { src: string; type: "joined"; payload: undefined }
  | { src: string; type: "left"; payload: undefined };

type IDSignalMessage = { src: "server"; type: "id"; payload: string };
type QueuedSignalMessage = Omit<SignalMessage, "src">;
type SignalMessageType = SignalMessage["type"];
type SignalMessagePayload<Type extends SignalMessageType> = Extract<
  SignalMessage,
  { type: Type }
>["payload"];

export class SignalClient {
  ws: WebSocket;
  clientId!: string;

  private queue: QueuedSignalMessage[] = [];

  constructor() {
    this.ws = new WebSocket("ws://192.168.1.70:3001/api/ws");

    this.ws.addEventListener("message", (ev) => {
      const data = JSON.parse(ev.data as string) as
        | SignalMessage
        | IDSignalMessage;

      if (data.type === "id") {
        this.clientId = data.payload;
      } else if (this.onmessage) {
        this.onmessage(data);
      } else {
        console.warn("Unhandled websocket message:", data);
      }
    });
  }

  async connected() {
    return new Promise<void>((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const handleError = () => {
        reject(new Error("WebSocket connection error"));
      };
      const handleClose = () => {
        reject(new Error("WebSocket connection closed"));
      };

      this.ws.addEventListener("error", handleError);
      this.ws.addEventListener("close", handleClose);

      this.ws.addEventListener(
        "open",
        () => {
          this.ws.removeEventListener("error", handleError);
          this.ws.removeEventListener("close", handleClose);

          let next = this.queue.shift();
          while (next) {
            this.send(next.type, next.payload);
            next = this.queue.shift();
          }

          resolve();
        },
        { once: true },
      );
    });
  }

  onmessage?: (message: SignalMessage) => void;

  close() {
    this.ws.close();
  }

  send<T extends SignalMessageType>(type: T, payload: SignalMessagePayload<T>) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.queue.push({ type, payload });
      return;
    }

    const body = {
      src: this.clientId,
      type,
      payload,
    } as SignalMessage;

    this.ws.send(JSON.stringify(body));
  }
}
