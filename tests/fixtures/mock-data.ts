import * as si from "systeminformation";
import { expect } from "vitest";

type NetworkStatsData = si.Systeminformation.NetworkStatsData;
type NetworkConnectionsData = si.Systeminformation.NetworkConnectionsData;

export const mockNetworkStats: NetworkStatsData[] = [
  {
    iface: "eth0",
    operstate: "up",
    rx_bytes: 1000,
    tx_bytes: 2000,
    rx_sec: 100,
    tx_sec: 200,
    rx_dropped: 0,
    rx_errors: 0,
    tx_dropped: 0,
    tx_errors: 0,
    ms: 0,
  },
];

export const mockNetworkConnections: NetworkConnectionsData[] = [
  {
    protocol: "tcp",
    localAddress: "eth0",
    localPort: "1080",
    peerAddress: "remote",
    peerPort: "12345",
    state: "ESTABLISHED",
    pid: 1234,
    process: "proxy",
  },
  {
    protocol: "tcp",
    localAddress: "eth0",
    localPort: "1080",
    peerAddress: "remote",
    peerPort: "12346",
    state: "ESTABLISHED",
    pid: 1234,
    process: "proxy",
  },
];

export const expectedStats = {
  basic: {
    upload: 2000,
    download: 1000,
    uploadSpeed: 200,
    downloadSpeed: 100,
    timestamp: expect.any(Number),
  },
  proxy: {
    activeConnections: 2,
    stats: {
      upload: 2000,
      download: 1000,
      uploadSpeed: 200,
      downloadSpeed: 100,
    },
  },
  fullStats: {
    proxied: {
      activeConnections: 2,
      upload: 2000,
      download: 1000,
      uploadSpeed: 200,
      downloadSpeed: 100,
    },
    direct: {
      upload: 0,
      download: 0,
      uploadSpeed: 0,
      downloadSpeed: 0,
    },
    timestamp: expect.any(Number),
  },
};
