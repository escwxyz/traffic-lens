import { afterEach, beforeEach, vi } from "vitest";

// Set up fake timers globally
vi.useFakeTimers();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});
