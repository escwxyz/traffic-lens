import { vi, describe, it, expect, beforeEach } from "vitest";
import TrafficLens from "../../src";
import * as si from "systeminformation";
import { mockNetworkStats, mockNetworkConnections, expectedStats } from "../fixtures/mock-data";

// Mock systeminformation module
vi.mock("systeminformation", () => ({
  networkStats: vi.fn(),
  networkConnections: vi.fn(),
}));

describe("TrafficLens", () => {
  let monitor: TrafficLens;

  beforeEach(() => {
    vi.clearAllMocks();
    monitor = new TrafficLens({ proxyPort: 1080 });
  });

  describe("Constructor", () => {
    it("should initialize with default update interval", () => {
      expect(monitor["config"].updateInterval).toBe(5000);
    });

    it("should initialize with custom update interval", () => {
      const monitor = new TrafficLens({ proxyPort: 1080, updateInterval: 8000 });
      expect(monitor["config"].updateInterval).toBe(8000);
    });

    it("should throw an error if update interval is less than 3 seconds", () => {
      expect(() => new TrafficLens({ proxyPort: 1080, updateInterval: 2000 })).toThrow(
        "Update interval must be greater than 3 seconds",
      );
    });
  });

  describe("Subscription Management", () => {
    it("should add and remove subscribers correctly", () => {
      const callback = vi.fn();
      const unsubscribe = monitor.subscribe(callback);

      expect(monitor["callbacks"].length).toBe(1);
      unsubscribe();
      expect(monitor["callbacks"].length).toBe(0);
    });

    it("should notify all subscribers with stats updates", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      monitor.subscribe(callback1);
      monitor.subscribe(callback2);

      // Mock for first interval (setting lastStats)
      vi.mocked(si.networkStats).mockResolvedValueOnce(mockNetworkStats).mockResolvedValueOnce(mockNetworkStats);
      vi.mocked(si.networkConnections).mockResolvedValueOnce(mockNetworkConnections);

      // Mock for second interval (calculating and notifying)
      vi.mocked(si.networkStats).mockResolvedValueOnce(mockNetworkStats).mockResolvedValueOnce(mockNetworkStats);
      vi.mocked(si.networkConnections).mockResolvedValueOnce(mockNetworkConnections);

      await monitor.start();
      // Wait for two intervals
      await vi.advanceTimersByTimeAsync(10000);

      // Verify callbacks were called with correct data
      expect(callback1).toHaveBeenCalledWith(expectedStats.fullStats);
      expect(callback2).toHaveBeenCalledWith(expectedStats.fullStats);
    });
  });

  describe("Network Stats Collection", () => {
    it("should collect network stats correctly", async () => {
      vi.mocked(si.networkStats).mockResolvedValueOnce(mockNetworkStats);

      const stats = await monitor["getCurrentStats"]();
      expect(stats).toEqual(expectedStats.basic);
    });

    it("should handle network stats errors", async () => {
      // Temporarily suppress console.error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(si.networkStats).mockRejectedValueOnce(new Error("Network error"));
      const stats = await monitor["getCurrentStats"]();

      expect(stats).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Error getting network stats:", expect.any(Error));

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  describe("Proxy Connection Detection", () => {
    it("should detect proxy connections correctly", async () => {
      vi.mocked(si.networkConnections).mockResolvedValueOnce(mockNetworkConnections);
      vi.mocked(si.networkStats).mockResolvedValueOnce(mockNetworkStats);

      const result = await monitor["checkProxyConnections"]();
      expect(result).toEqual(expectedStats.proxy);
    });
  });

  describe("Formatting Functions", () => {
    it("should format bytes correctly", () => {
      expect(TrafficLens.formatBytes(1024)).toBe("1.00 KB");
      expect(TrafficLens.formatBytes(1048576)).toBe("1.00 MB");
      expect(TrafficLens.formatBytes(1073741824)).toBe("1.00 GB");
    });

    it("should format speed correctly", () => {
      expect(TrafficLens.formatSpeed(1024)).toBe("1.00 KB/s");
      expect(TrafficLens.formatSpeed(1048576)).toBe("1.00 MB/s");
    });
  });

  describe("Monitor Control", () => {
    it("should prevent multiple start calls", async () => {
      await monitor.start();
      await expect(monitor.start()).rejects.toThrow("Monitor is already running");
    });

    it("should stop monitoring correctly", async () => {
      await monitor.start();
      monitor.stop();
      expect(monitor["intervalId"]).toBeNull();
    });
  });

  describe("Stats Retrieval", () => {
    it("should return current traffic stats", () => {
      const stats = monitor.getTrafficStats();
      expect(stats).toHaveProperty("proxied");
      expect(stats).toHaveProperty("direct");
      expect(stats).toHaveProperty("timestamp");
    });

    it("should return proxy speeds", () => {
      const speeds = monitor.getProxySpeed();
      expect(speeds).toHaveProperty("uploadSpeed");
      expect(speeds).toHaveProperty("downloadSpeed");
    });

    it("should return direct speeds", () => {
      const speeds = monitor.getDirectSpeed();
      expect(speeds).toHaveProperty("uploadSpeed");
      expect(speeds).toHaveProperty("downloadSpeed");
    });
  });
});
