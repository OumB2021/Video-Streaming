export type RTCEventMap = {
  offer: (payload: RTCSessionDescriptionInit) => void;
  answer: (payload: RTCSessionDescriptionInit) => void;
  "ice-candidate": (payload: RTCIceCandidateInit) => void;
};

export type RTCEventPayload<T extends keyof RTCEventMap> = Parameters<
  RTCEventMap[T]
>[0];
