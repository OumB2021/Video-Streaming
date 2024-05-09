// Augment the socket.io and socket.io-client modules to include these as event types.

// ListenEvents extends EventsMap = DefaultEventsMap, EmitEvents extends EventsMap = ListenEvents

export type RTCOfferEvent = ["offer", RTCSessionDescriptionInit];

export type RTCAnswerEvent = ["answer", RTCSessionDescriptionInit];

export type RTCCandidateEvent = ["ice-candidate", RTCIceCandidateInit];

export type RTCEvent = RTCOfferEvent | RTCAnswerEvent | RTCCandidateEvent;
export type RTCEventType = RTCEvent[0];
export type RTCEventPayload<T extends RTCEventType> = Extract<
  RTCEvent,
  [T, any]
>[1];

export type RTCEventMap = {
  offer: (payload: RTCSessionDescriptionInit) => void;
  answer: (payload: RTCSessionDescriptionInit) => void;
  "ice-candidate": (payload: RTCIceCandidateInit) => void;
};
