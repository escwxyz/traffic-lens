# TrafficLens

[![CI](https://github.com/escwxyz/traffic-lens/actions/workflows/ci.yaml/badge.svg)](https://github.com/escwxyz/traffic-lens/actions/workflows/ci.yaml)
[![npm version](https://badge.fury.io/js/traffic-lens.svg)](https://badge.fury.io/js/traffic-lens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js library for monitoring network traffic with proxy connection awareness. TrafficLens provides real-time statistics about your system's network usage, distinguishing between proxied and direct traffic.

## Features

- Real-time network traffic monitoring
- Proxy connection detection and statistics
- Separate tracking for direct and proxied traffic
- Human-readable traffic formatting
- Event-based updates via subscription
- TypeScript support

## Installation

```bash
pnpm add traffic-lens
```

or

```bash
npm install traffic-lens
```

or

```bash
yarn add traffic-lens
```

## Usage

### Basic Example

```typescript
import TrafficLens from "traffic-lens";
// Initialize with proxy port
const monitor = new TrafficLens({ proxyPort: 1080 });
// Subscribe to traffic updates
monitor.subscribe((stats) => {
  console.log("Proxy Traffic:", TrafficLens.formatSpeed(stats.proxied.uploadSpeed));
  console.log("Direct Traffic:", TrafficLens.formatSpeed(stats.direct.uploadSpeed));
});
// Start monitoring
await monitor.start();
// ... when done
monitor.stop();
```

### Configuration

```typescript
const monitor = new TrafficLens({
  proxyPort: 1080, // Required: Your proxy server port
  updateInterval: 5000, // Optional: Update interval in ms (default: 5000, cannot be less than 3000)
});
```

### Traffic Statistics

The monitor provides detailed traffic statistics through various methods:

```typescript
// Get all traffic stats
const stats = monitor.getTrafficStats();
console.log(stats);

/**
{
proxied: {
upload: number,
download: number,
uploadSpeed: number,
downloadSpeed: number,
activeConnections: number
},
direct: {
upload: number,
download: number,
uploadSpeed: number,
downloadSpeed: number
},
timestamp: number
}
**/

// Get proxy speeds only
const proxySpeed = monitor.getProxySpeed();
console.log(proxySpeed); // { uploadSpeed: number, downloadSpeed: number }
// Get direct traffic speeds only
const directSpeed = monitor.getDirectSpeed();
console.log(directSpeed); // { uploadSpeed: number, downloadSpeed: number }
```

### Formatting Utilities

```typescript
// Format bytes to human readable string
TrafficLens.formatBytes(1024); // "1.00 KB"
TrafficLens.formatBytes(1048576); // "1.00 MB"
// Format speed to human readable string
TrafficLens.formatSpeed(1024); // "1.00 KB/s"
TrafficLens.formatSpeed(1048576); // "1.00 MB/s"
```

### Event Subscription

```typescript
// Subscribe to updates
const unsubscribe = monitor.subscribe((stats) => {
  console.log("New traffic stats:", stats);
});
// Unsubscribe when done
unsubscribe();
```

## API Reference

### Class: TrafficLens

#### Constructor

- `new TrafficLens(config: Config)`: Creates a new traffic monitor instance

#### Methods

- `start(): Promise<void>`: Starts monitoring network traffic
- `stop(): void`: Stops monitoring network traffic
- `subscribe(callback: MonitorCallback): () => void`: Subscribes to traffic updates
- `getTrafficStats(): TrafficStats`: Gets current traffic statistics
- `getProxySpeed(): SpeedMetrics`: Gets current proxy connection speeds
- `getDirectSpeed(): SpeedMetrics`: Gets current direct connection speeds
- `static formatBytes(bytes: number): string`: Formats bytes to human readable string
- `static formatSpeed(bytesPerSec: number): string`: Formats speed to human readable string

## Types

```typescript
interface Config {
  proxyPort: number;
  updateInterval?: number; // milliseconds
}
interface TrafficStats {
  proxied: ProxyMetrics;
  direct: NetworkMetrics;
  timestamp: number;
}
interface NetworkMetrics {
  upload: number;
  download: number;
  uploadSpeed: number;
  downloadSpeed: number;
}
interface ProxyMetrics extends NetworkMetrics {
  activeConnections: number;
}
```

## Requirements

- Node.js 18.x or later
- System with network interfaces

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details
