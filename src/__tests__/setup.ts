import "@testing-library/jest-dom";

// jsdom has no ResizeObserver; recharts' ResponsiveContainer (used by the
// dashboard charts, add-role-dashboard) needs one to mount without throwing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
