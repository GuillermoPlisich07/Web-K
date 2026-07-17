export type ClientPersona = "ANGRY" | "DIFFICULT" | "INDIFFERENT" | "DEMANDING";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Industry = "SOFTWARE_B2B" | "FINANZAS" | "CONSULTORIA" | "TELCO" | "SEGUROS" | "RETAIL" | "SALUD" | "OTRO";
export type SessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";
export type Speaker = "VENDOR" | "CLIENT";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  clientPersona: ClientPersona;
  difficulty: Difficulty;
  /** Pure behaviour/persona profile of the client avatar */
  systemPrompt?: string;
  /** The assembled XML-CREST system prompt returned by the backend */
  compiledSystemPrompt?: string;
  vendedorRol?: string;
  escenarioObjetivo?: string;
  empresaId?: string;
  productoId?: string;
  avatarVoiceId?: string;
  objectionsGuide?: string;
  faq?: string;
  industries?: Industry[];
  maxDurationMinutes?: number;
  evaluationWeights?: string;
  forbiddenPhrases?: string;
  createdBy?: string;
  /** Server-derived display name of the real creator — read-only, not settable on create/update. */
  ownerName?: string;
  createdByUserId?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  scenario: Scenario;
  vendorName: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  totalTurns?: number;
  overallScore?: number;
}

export interface TranscriptTurn {
  id?: string;
  turnNumber: number;
  speaker: Speaker;
  text: string;
}

export interface BiometricSample {
  timestampMs: number;
  dominantEmotion?: string;
  emotions?: Record<string, number>;
}

export interface SessionReport {
  id: string;
  feedbackText: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  scorePersuasion: number;
  scoreConfidence: number;
  scoreProductKnowledge: number;
  scoreObjectionHandling: number;
  scorePronunciation: number;
  generatedAt: string;
  session?: Session;
}

export interface WsMessage {
  type: string;
  text?: string;
  turn?: number;
  speaker?: string;
  is_final?: boolean;
  emotions?: Record<string, number>;
  dominant?: string;
  chunk_index?: number;
  message?: string;
}
