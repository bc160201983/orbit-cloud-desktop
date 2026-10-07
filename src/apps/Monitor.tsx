import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Activity,
  Heart,
  Download,
  Check,
  Paintbrush,
  Cloud,
  Code2,
  Headphones,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
import { useOS } from "../core/store";
import { apps } from "../core/registry";
export function Monitor() {
  const { windows, files } = useOS();
  const [time, setTime] = useState(Date.now());
  const [start] = useState(Date.now());
  const [usage, setUsage] = useState<number[]>(Array(35).fill(0));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(Date.now());
      const heap = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      setUsage((u) => [
        ...u.slice(1),
        heap ? heap.usedJSHeapSize / 1048576 : 0,
      ]);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const heap = (
    performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;
  return (
    <div className="monitor-app">
      <div className="eyebrow">A LOOK UNDER THE HOOD</div>
      <h1>Everything in balance.</h1>
      <div className="monitor-cards">
        <div>
          <Activity />
          <small>Open applications</small>
          <strong>{windows.length}</strong>
        </div>
        <div>
          <Cloud />
          <small>JS heap memory</small>
          <strong>
            {heap
              ? `${Math.round(heap.usedJSHeapSize / 1048576)} MB`
              : "Unavailable"}
          </strong>
        </div>
        <div>
          <Leaf />
          <small>Hosted storage</small>
          <strong>
            {(files.reduce((n, f) => n + (f.size || 0), 0) / 1024).toFixed(1)}{" "}
            KB
          </strong>
        </div>
      </div>
      <h3>
        Memory over time <small>Browser-reported · MB</small>
      </h3>
      <div className="usage-chart">
        {usage.map((n, i) => (
          <i key={i} style={{ height: `${Math.max(2, Math.min(100, n))}%` }} />
        ))}
      </div>
      {!heap && (
        <p className="muted">
          This browser doesn’t expose memory metrics. CPU and battery telemetry
          are not available to web apps.
        </p>
      )}
      <h3>Running applications</h3>
      <div className="process-list">
        {windows.map((w) => {
          const a = apps.find((a) => a.id === w.app)!;
          return (
            <div key={w.id}>
              <a.icon size={18} />
              <span>{a.name}</span>
              <small>{w.minimized ? "Minimized" : "Active"}</small>
            </div>
          );
        })}
      </div>
      <footer>
        Session uptime: {Math.floor((time - start) / 60000)}m{" "}
        {Math.floor((time - start) / 1000) % 60}s ·{" "}
        {navigator.hardwareConcurrency || "Unknown"} logical processors
      </footer>
    </div>
  );
}
