import { create } from "zustand";
import { Speaker } from "../types";

export interface TranscriptEntry {
  turn: number;
  speaker: Speaker;
  text: string;
}

interface SessionStore {
  sessionId: string | null;
  scenarioId: string | null;
  vendorName: string;
  status: "idle" | "active" | "ended";
  transcript: TranscriptEntry[];
  currentEmotion: string | null;
  isRecording: boolean;
  isAvatarSpeaking: boolean;
  elapsedSeconds: number;
  tavusConversationUrl: string | null;
  /** Core-k-issued delegated token presented directly to AI-Service-k (add-service-auth). */
  delegatedToken: string | null;

  setSession: (id: string, scenarioId: string, vendorName: string, delegatedToken: string | null) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setCurrentEmotion: (emotion: string | null) => void;
  setIsRecording: (v: boolean) => void;
  setIsAvatarSpeaking: (v: boolean) => void;
  incrementElapsed: () => void;
  setTavusUrl: (url: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  scenarioId: null,
  vendorName: "",
  status: "idle",
  transcript: [],
  currentEmotion: null,
  isRecording: false,
  isAvatarSpeaking: false,
  elapsedSeconds: 0,
  tavusConversationUrl: null,
  delegatedToken: null,

  setSession: (id, scenarioId, vendorName, delegatedToken) =>
    set({ sessionId: id, scenarioId, vendorName, delegatedToken, status: "active" }),
  addTranscriptEntry: (entry) =>
    set((s) => ({ transcript: [...s.transcript, entry] })),
  setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),
  setIsRecording: (v) => set({ isRecording: v }),
  setIsAvatarSpeaking: (v) => set({ isAvatarSpeaking: v }),
  incrementElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  setTavusUrl: (url) => set({ tavusConversationUrl: url }),
  reset: () =>
    set({
      sessionId: null, scenarioId: null, vendorName: "",
      status: "idle", transcript: [], currentEmotion: null,
      isRecording: false, isAvatarSpeaking: false, elapsedSeconds: 0,
      tavusConversationUrl: null, delegatedToken: null,
    }),
}));
