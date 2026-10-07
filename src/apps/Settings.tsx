import {
  Monitor,
  Palette,
  Volume2,
  Wifi,
  Info,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { useState } from "react";
import { useOS } from "../core/store";
import { wallpapers } from "../core/registry";
export default function Settings() {
  const { preferences: p, setPreferences: set, notify } = useOS();
  const [tab, setTab] = useState("Appearance");
  const update = (v: Partial<typeof p>) => set((s) => ({ ...s, ...v }));
  return (
    <div className="settings-app">
      <aside>
        <h2>Settings</h2>
        {[
          { name: "Appearance", icon: Palette },
          { name: "Display", icon: Monitor },
          { name: "Sound", icon: Volume2 },
          { name: "Network", icon: Wifi },
          { name: "About Orbit", icon: Info },
        ].map((t) => (
          <button
            className={tab === t.name ? "selected" : ""}
            key={t.name}
            onClick={() => setTab(t.name)}
          >
            <t.icon size={18} />
            {t.name}
          </button>
        ))}
      </aside>
      <main>
        <div className="eyebrow">MAKE IT YOURS</div>
        <h1>{tab}</h1>
        <p className="muted">A space that feels a little more like you.</p>
        {tab === "Appearance" ? (
          <>
            <h3>Color mode</h3>
            <div className="theme-options">
              {(["light", "dark"] as const).map((theme) => (
                <button
                  key={theme}
                  className={`theme-card ${p.theme === theme ? "chosen" : ""}`}
                  onClick={() => update({ theme })}
                >
                  {theme === "light" ? <Sun /> : <Moon />}
                  <span>
                    {theme === "light" ? "Light & airy" : "After hours"}
                  </span>
                  {p.theme === theme && <Check size={16} />}
                </button>
              ))}
            </div>
            <h3>Desktop wallpaper</h3>
            <div className="wallpaper-options">
              {wallpapers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => update({ wallpaper: w.id })}
                  className={p.wallpaper === w.id ? "chosen" : ""}
                >
                  <div
                    style={{
                      backgroundImage: w.url ? `url(${w.url})` : undefined,
                    }}
                  >
                    {p.wallpaper === w.id && <Check size={18} />}
                  </div>
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
            <div className="setting-row">
              <span>
                Your preferences are saved automatically
                <small>Stored privately in this browser</small>
              </span>
              <Check size={19} />
            </div>
          </>
        ) : tab === "Display" ? (
          <>
            <h3>Brightness</h3>
            <div className="setting-row">
              <Sun />
              <input
                aria-label="Brightness"
                type="range"
                min="25"
                max="100"
                value={p.brightness}
                onChange={(e) => update({ brightness: +e.target.value })}
              />
              <span>{p.brightness}%</span>
            </div>
            <p className="muted">Adjusts the desktop wallpaper brightness.</p>
            <div className="setting-row">
              Resolution{" "}
              <span>
                {innerWidth} × {innerHeight}
              </span>
            </div>
          </>
        ) : tab === "Sound" ? (
          <>
            <h3>Master volume</h3>
            <div className="setting-row">
              <Volume2 />
              <input
                aria-label="Volume"
                type="range"
                value={p.volume}
                onChange={(e) => update({ volume: +e.target.value })}
              />
              <span>{p.volume}%</span>
            </div>
            <button
              onClick={() => {
                const ctx = new AudioContext();
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                gain.gain.value = p.volume / 500;
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.25);
                oscillator.onended = () => void ctx.close();
                notify("Sound", "Test tone played");
              }}
            >
              Play test sound
            </button>
          </>
        ) : tab === "Network" ? (
          <>
            <div className="setting-row">
              <span>
                Wi-Fi<small>Browser-managed connectivity</small>
              </span>
              <button
                className={p.wifi ? "primary" : ""}
                onClick={() => update({ wifi: !p.wifi })}
              >
                {p.wifi ? "On" : "Off"}
              </button>
            </div>
            <div className="setting-row">
              <span>
                Bluetooth
                <small>Desktop preference; hardware is browser-managed</small>
              </span>
              <button onClick={() => update({ bluetooth: !p.bluetooth })}>
                {p.bluetooth ? "On" : "Off"}
              </button>
            </div>
            <p className="muted">
              These controls save desktop preferences. Your browser and
              operating system manage actual network connections.
            </p>
          </>
        ) : (
          <>
            <div className="about-logo">◉</div>
            <h2>Orbit</h2>
            <p>Your space, reimagined.</p>
            <div className="setting-row">
              Version<span>2.0.0</span>
            </div>
            <div className="setting-row">
              Platform<span>Browser desktop</span>
            </div>
            <div className="setting-row">
              Storage<span>Private cloud drive</span>
            </div>
            <p className="muted">
              Built with React, TypeScript, and a little room to dream.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
