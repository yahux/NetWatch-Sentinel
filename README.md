# 🛡️ NetWatch Sentinel

**A proprietary, real-time network traffic visualizer and forensic detection platform.**

NetWatch Sentinel provides enterprise-grade situational awareness through dynamic, force-directed telemetry. Built for high-stakes cybersecurity and infrastructure monitoring.

![NetWatch Sentinel Dashboard](assets/netwatch-map-snapshot-2026-06-04T01-45-07-967Z.png)

---

## 🚀 Features
* **Live Telemetry:** Force-directed graph with real-time particle-stream animations.
* **Forensic Intelligence:** Automated incident recording engine with system snapshots.
* **AI-Threat Analysis:** Real-time "thinking" typewriter-effect logs for anomaly detection.
* **Panic Mode:** Reactive UI that triggers global alerts upon critical threat thresholds.
* **Hardcoded Security:** Proprietary branding & locked UI states for enterprise integrity.

---

## 🏗️ Architecture

| Component | Responsibility |
| :--- | :--- |
| `src/hooks/useNetworkData.ts` | Centralized state management & data flow |
| `src/services/networkSimulator.ts` | Mock intrusion injection & traffic patterns |
| `src/components/NetworkGraph.tsx` | Canvas-based force-directed rendering |
| `src/components/ForensicRecorder.tsx` | Post-incident forensic log generation |
| `src/components/ThreatAnalysisPanel.tsx` | AI-driven threat severity & status gauging |
| `src/components/TypewriterText.tsx` | Real-time log/terminal interface |

---

🛠️ Tech Stack
React 18 · TypeScript · Vite · Tailwind CSS · react-force-graph-2d

---

⚡ Quick Start
Bash
# Install dependencies
npm install

# Launch the sentinel
npm run dev

Built with security and performance in mind.
---

## 🐍 Python API Integration
Easily connect NetWatch Sentinel to any backend telemetry stream. Implement the `NetworkDataSource` interface and pass it to your hook:

```tsx
// Connect to your custom Python/FastAPI data source
const feed = useNetworkData({ 
  dataSource: myPythonApiSource 
});
