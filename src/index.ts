import * as si from "systeminformation";

/**
 * Configuration options for TrafficLens
 * @interface Config
 */
export interface Config {
  /** The port number used by your proxy server */
  proxyPort: number;
  /** Update interval in milliseconds (minimum 3000ms, default 5000ms) */
  updateInterval?: number;
}

/**
 * Base metrics for network traffic volume
 * @interface VolumeMetrics
 */
interface VolumeMetrics {
  /** Total bytes uploaded */
  upload: number;
  /** Total bytes downloaded */
  download: number;
}

/**
 * Metrics for network speed
 * @interface SpeedMetrics
 */
interface SpeedMetrics {
  /** Upload speed in bytes per second */
  uploadSpeed: number;
  /** Download speed in bytes per second */
  downloadSpeed: number;
}

/**
 * Combined metrics for network traffic including both volume and speed
 * @interface NetworkMetrics
 */
export type NetworkMetrics = VolumeMetrics & SpeedMetrics;

/**
 * Network traffic snapshot with timestamp
 * @interface NetworkSnapshot
 * @extends NetworkMetrics
 */
interface NetworkSnapshot extends NetworkMetrics {
  /** Timestamp when the snapshot was taken */
  timestamp: number;
}

/**
 * Metrics specific to proxy connections
 * @interface ProxyMetrics
 * @extends NetworkMetrics
 */
export interface ProxyMetrics extends NetworkMetrics {
  /** Number of active proxy connections */
  activeConnections: number;
}

/**
 * Complete traffic statistics including both proxied and direct traffic
 * @interface TrafficStats
 */
export interface TrafficStats {
  /** Statistics for proxied traffic */
  proxied: ProxyMetrics;
  /** Statistics for direct (non-proxied) traffic */
  direct: NetworkMetrics;
  /** Timestamp when the statistics were collected */
  timestamp: number;
}

/** Callback function type for traffic updates */
export type MonitorCallback = (stats: TrafficStats) => void;

/**
 * TrafficLens - A network traffic monitoring tool with proxy awareness
 * @class
 */
class TrafficLens {
  private lastStats: NetworkSnapshot | null = null;
  private totalStats: TrafficStats = {
    proxied: {
      upload: 0,
      download: 0,
      uploadSpeed: 0,
      downloadSpeed: 0,
      activeConnections: 0,
    },
    direct: {
      upload: 0,
      download: 0,
      uploadSpeed: 0,
      downloadSpeed: 0,
    },
    timestamp: Date.now(),
  };
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks: MonitorCallback[] = [];
  private config: Config;

  /**
   * Creates a new TrafficLens instance
   * @param {Config} config - Configuration options
   * @throws {Error} If update interval is less than 3 seconds
   * @example
   * ```typescript
   * const monitor = new TrafficLens({
   *   proxyPort: 1080,
   *   updateInterval: 5000
   * });
   * ```
   */
  constructor(config: Config) {
    if (config.updateInterval && config.updateInterval < 3000) {
      throw new Error("Update interval must be greater than 3 seconds");
    }

    this.config = {
      updateInterval: config.updateInterval || 5000,
      ...config,
    };
  }

  /**
   * Get the current network stats
   * @returns NetworkStats | null
   */
  private async getCurrentStats(): Promise<NetworkSnapshot | null> {
    try {
      const networkStats = await si.networkStats();
      const mainInterface = networkStats.find((stat) => stat.operstate === "up" && stat.rx_bytes > 0);

      if (!mainInterface) return null;

      return {
        uploadSpeed: mainInterface.tx_sec || 0,
        downloadSpeed: mainInterface.rx_sec || 0,
        upload: mainInterface.tx_bytes || 0,
        download: mainInterface.rx_bytes || 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error getting network stats:", error);
      return null;
    }
  }

  /**
   * Get the current proxy connections
   * @returns ProxyConnections
   */
  private async checkProxyConnections() {
    try {
      const netConnections = await si.networkConnections();
      const networkStats = await si.networkStats();

      const proxyConnections = netConnections.filter((conn) => conn.localPort === this.config.proxyPort.toString());

      const proxyInterface = networkStats.find((stat) => {
        return proxyConnections.some((conn) => conn.localAddress.includes(stat.iface));
      });

      return {
        activeConnections: proxyConnections.length,
        stats: proxyInterface
          ? {
              upload: proxyInterface.tx_bytes,
              download: proxyInterface.rx_bytes,
              uploadSpeed: proxyInterface.tx_sec,
              downloadSpeed: proxyInterface.rx_sec,
            }
          : null,
      };
    } catch (error) {
      console.error("Error checking proxy connections:", error);
      return {
        activeConnections: 0,
        stats: null,
      };
    }
  }

  /**
   * Starts monitoring network traffic
   * @returns {Promise<void>}
   * @throws {Error} If monitor is already running
   * @example
   * ```typescript
   * await monitor.start();
   * ```
   */
  public async start(): Promise<void> {
    if (this.intervalId) {
      throw new Error("Monitor is already running");
    }

    this.intervalId = setInterval(async () => {
      const currentStats = await this.getCurrentStats();
      const proxyResults = await this.checkProxyConnections();

      if (!currentStats) return;

      if (this.lastStats) {
        this.totalStats.timestamp = Date.now();

        this.totalStats.proxied.activeConnections = proxyResults.activeConnections;
        if (proxyResults.stats) {
          this.totalStats.proxied = {
            ...proxyResults.stats,
            activeConnections: proxyResults.activeConnections,
          };
        }

        this.totalStats.direct = {
          upload: currentStats.upload - (proxyResults.stats?.upload || 0),
          download: currentStats.download - (proxyResults.stats?.download || 0),
          uploadSpeed: currentStats.uploadSpeed - (proxyResults.stats?.uploadSpeed || 0),
          downloadSpeed: currentStats.downloadSpeed - (proxyResults.stats?.downloadSpeed || 0),
        };

        this.callbacks.forEach((callback) => callback(this.totalStats));
      }

      this.lastStats = currentStats;
    }, this.config.updateInterval);
  }

  /**
   * Stops monitoring network traffic
   * @example
   * ```typescript
   * monitor.stop();
   * ```
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Subscribes to traffic updates
   * @param {MonitorCallback} callback - Function to be called with traffic updates
   * @returns {Function} Unsubscribe function
   * @example
   * ```typescript
   * const unsubscribe = monitor.subscribe((stats) => {
   *   console.log('Upload speed:', stats.proxied.uploadSpeed);
   * });
   *
   * // Later, to unsubscribe:
   * unsubscribe();
   * ```
   */
  public subscribe(callback: MonitorCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Gets the current traffic statistics
   * @returns {TrafficStats} Current traffic statistics
   * @example
   * ```typescript
   * const stats = monitor.getTrafficStats();
   * console.log('Active proxy connections:', stats.proxied.activeConnections);
   * ```
   */
  public getTrafficStats(): TrafficStats {
    return this.totalStats;
  }

  /**
   * Gets current speeds for proxied connections
   * @returns {SpeedMetrics} Current proxy connection speeds
   * @example
   * ```typescript
   * const speeds = monitor.getProxySpeed();
   * console.log('Proxy upload speed:', TrafficLens.formatSpeed(speeds.uploadSpeed));
   * ```
   */
  public getProxySpeed(): SpeedMetrics {
    return {
      uploadSpeed: this.totalStats.proxied.uploadSpeed,
      downloadSpeed: this.totalStats.proxied.downloadSpeed,
    };
  }

  /**
   * Gets current speeds for direct connections
   * @returns {SpeedMetrics} Current direct connection speeds
   * @example
   * ```typescript
   * const speeds = monitor.getDirectSpeed();
   * console.log('Direct download speed:', TrafficLens.formatSpeed(speeds.downloadSpeed));
   * ```
   */
  public getDirectSpeed(): SpeedMetrics {
    return {
      uploadSpeed: this.totalStats.direct.uploadSpeed,
      downloadSpeed: this.totalStats.direct.downloadSpeed,
    };
  }

  /**
   * Formats traffic bytes to a human readable string
   * @param {number} bytes - Number of bytes to format
   * @returns {string} Formatted string with appropriate unit
   * @example
   * ```typescript
   * TrafficLens.formatBytes(1024);  // "1.00 KB"
   * TrafficLens.formatBytes(1048576);  // "1.00 MB"
   * ```
   */
  public static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Formats speed to a human readable string (bytes per second)
   * @param {number} bytesPerSec - Speed in bytes per second
   * @returns {string} Formatted string with appropriate unit per second
   * @example
   * ```typescript
   * TrafficLens.formatSpeed(1024);  // "1.00 KB/s"
   * TrafficLens.formatSpeed(1048576);  // "1.00 MB/s"
   * ```
   */
  public static formatSpeed(bytesPerSec: number): string {
    return `${TrafficLens.formatBytes(bytesPerSec)}/s`;
  }
}

export default TrafficLens;
