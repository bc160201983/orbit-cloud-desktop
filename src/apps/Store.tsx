import { useAccountKey } from "../core/persistence";
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
export function Store() {
  const storageKey = useAccountKey("orbit-store");
  const os = useOS();
  const [tab, setTab] = useState("Discover");
  const [installed, setInstalled] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });
  const recommendations = [
    {
      name: "Canvas",
      description: "A little room for your imagination.",
      icon: Paintbrush,
      color: "#bd907b",
    },
    {
      name: "Focus",
      description: "Find your rhythm. Keep your flow.",
      icon: Leaf,
      color: "#89a28d",
    },
    {
      name: "Soundscape",
      description: "A world of calm, one sound at a time.",
      icon: Headphones,
      color: "#9b91b0",
    },
    {
      name: "Dev Studio",
      description: "Big ideas start with a line of code.",
      icon: Code2,
      color: "#829aa9",
    },
  ];
  return (
    <div className="store-app">
      <div className="store-nav">
        <h2>
          App Store <span>PREVIEW</span>
        </h2>
        {["Discover", "Installed"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Discover" ? (
        <>
          <div className="store-hero">
            <span className="eyebrow">MADE FOR YOUR EVERYDAY</span>
            <h1>
              Small apps.
              <br />
              Endless possibilities.
            </h1>
            <p>Find your next favorite way to create.</p>
            <div className="hero-shapes">
              <Paintbrush size={48} />
              <Heart size={35} />
              <Leaf size={44} />
            </div>
          </div>
          <h3>
            Explore something new <ArrowUpRight size={18} />
          </h3>
          <div className="store-grid">
            {recommendations.map((a) => (
              <div key={a.name}>
                <div className="store-icon" style={{ background: a.color }}>
                  <a.icon size={28} />
                </div>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
                <button
                  onClick={() => {
                    if (!installed.includes(a.name)) {
                      const next = [...installed, a.name];
                      setInstalled(next);
                      localStorage.setItem(storageKey, JSON.stringify(next));
                      os.notify(
                        "Added to your collection",
                        `${a.name} is a catalog preview. Executable apps are available below.`,
                      );
                    }
                  }}
                >
                  {installed.includes(a.name) ? (
                    <>
                      <Check size={14} />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Add to collection
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="muted">
            Preview catalog · Collection entries are mockups, not downloadable
            applications.
          </p>
        </>
      ) : (
        <>
          <h1>Your essentials.</h1>
          <div className="installed-grid">
            {apps
              .filter((a) => a.id !== "admin" || os.user.role === "admin")
              .map((a) => (
                <button key={a.id} onClick={() => os.open(a.id)}>
                  <a.icon style={{ color: a.color }} />
                  <span>{a.name}</span>
                  <ExternalLink size={14} />
                </button>
              ))}
          </div>
          <h3>Preview collection</h3>
          {installed.length ? (
            installed.map((n) => (
              <div className="setting-row" key={n}>
                {n}
                <button
                  onClick={() => {
                    const next = installed.filter((x) => x !== n);
                    setInstalled(next);
                    localStorage.setItem(storageKey, JSON.stringify(next));
                  }}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="muted">No catalog previews added yet.</p>
          )}
        </>
      )}
    </div>
  );
}
