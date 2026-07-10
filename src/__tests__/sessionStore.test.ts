import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "../store/sessionStore";

describe("sessionStore", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it("initial state is empty", () => {
    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.scenarioId).toBeNull();
    expect(state.vendorName).toBe("");
    expect(state.transcript).toEqual([]);
    expect(state.isAvatarSpeaking).toBe(false);
  });

  it("setSession updates sessionId, scenarioId, vendorName and delegatedToken", () => {
    useSessionStore.getState().setSession("sess-1", "scen-1", "Juan", "delegated-token-abc");
    const state = useSessionStore.getState();
    expect(state.sessionId).toBe("sess-1");
    expect(state.scenarioId).toBe("scen-1");
    expect(state.vendorName).toBe("Juan");
    expect(state.delegatedToken).toBe("delegated-token-abc");
  });

  it("setTavusUrl updates tavusConversationUrl", () => {
    useSessionStore.getState().setTavusUrl("https://tavus.io/abc");
    expect(useSessionStore.getState().tavusConversationUrl).toBe("https://tavus.io/abc");
  });

  it("reset clears all state back to initial", () => {
    useSessionStore.getState().setSession("sess-1", "scen-1", "Juan", "delegated-token-abc");
    useSessionStore.getState().reset();
    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.vendorName).toBe("");
    expect(state.transcript).toEqual([]);
    expect(state.delegatedToken).toBeNull();
  });
});
