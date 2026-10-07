import { useEffect, useState } from "react";
import {
  Search,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  BatteryFull,
  Bell,
  Sun,
  Bluetooth,
  ChevronRight,
  ArrowUpRight,
  Settings,
  Power,
  Check,
  RefreshCw,
  Image,
  FolderPlus,
  Grid2X2,
  X,
  Moon,
  Monitor,
  Command,
} from "lucide-react";
import { useOS } from "../core/store";
import { apps, appById, wallpapers } from "../core/registry";
import type { AppId } from "../core/types";
import Window from "./Window";
import * as fs from "../core/filesystem";
function AppIcon({ id, size = 24 }: { id: AppId; size?: number }) {
  const a = appById(id);
  return (
    <span
      className={`app-icon icon-${id}`}
      style={{ "--icon-color": a.color } as React.CSSProperties}
    >
      <a.icon size={size} strokeWidth={1.8} />
    </span>
  );
}
export default function Desktop() {
  const os = useOS();
  const [clock, setClock] = useState(new Date());
  const [panel, setPanel] = useState<
    "launcher" | "search" | "quick" | "notifications" | null
  >(null);
  const [query, setQuery] = useState("");
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState(false);
  const [showIcons, setShowIcons] = useState(true);
  const [confirmPower, setConfirmPower] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (os.notices.length) {
      setToast(true);
      const id = setTimeout(() => setToast(false), 4500);
      return () => clearTimeout(id);
    }
  }, [os.notices[0]?.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setContext(null);
        setConfirmPower(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        e.preventDefault();
        setPanel((p) => (p === "search" ? null : "search"));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const toggle = (p: typeof panel) => {
    setPanel(panel === p ? null : p);
    setContext(null);
    setQuery("");
  };
  const open = (id: AppId) => {
    os.open(id);
    setPanel(null);
  };
  const wallpaper =
    wallpapers.find((w) => w.id === os.preferences.wallpaper) || wallpapers[0];
  const results = apps.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );
  const fileResults = query
    ? os.files
        .filter(
          (f) =>
            f.kind === "file" &&
            f.name.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  const hour = clock.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div
      className={`desktop theme-${os.preferences.theme}`}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest(".app-window,.panel,.dock"))
          return;
        e.preventDefault();
        setContext({
          x: Math.min(e.clientX, innerWidth - 230),
          y: Math.min(e.clientY, innerHeight - 265),
        });
        setPanel(null);
      }}
    >
      <div
        className={`wallpaper wallpaper-${wallpaper.id}`}
        style={{
          backgroundImage: wallpaper.url ? `url(${wallpaper.url})` : undefined,
          filter: `brightness(${os.preferences.brightness / 100})`,
        }}
      />
      <div className="wallpaper-tint" />
      <header className="topbar">
        <button className="brand" onClick={() => toggle("launcher")}>
          <span className="orbit-logo">◉</span>
          <b>orbit</b>
        </button>
        <div className="topbar-left">
          <span>Personal workspace</span>
          <span className="topbar-divider" />
          <span className="workspace-dot" />
          Everything, in its place.
        </div>
        <div className="topbar-right">
          <button
            onClick={() => toggle("notifications")}
            aria-label="Open notifications"
          >
            <Bell size={15} />
            {os.notices.length > 0 && <i />}
          </button>
          <span>
            {clock.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="topbar-divider" />
          <button
            onClick={() => toggle("quick")}
            aria-label="Open quick settings"
          >
            {os.preferences.wifi ? <Wifi size={15} /> : <WifiOff size={15} />}
            <BatteryFull size={18} />
            <span>100%</span>
          </button>
        </div>
      </header>
      <div className="desktop-greeting">
        <div className="eyebrow">A LITTLE SPACE. A WORLD OF POSSIBILITIES.</div>
        <h1>
          {greeting}, Alex<span>✦</span>
        </h1>
        <p>Make room for what matters.</p>
        <div className="greeting-date">
          {clock.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          <span> / </span>
          <span className="live-clock">
            {clock.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
      {showIcons && (
        <div className="desktop-icons">
          {(["files", "notes", "browser", "store"] as AppId[]).map((id) => (
            <button
              key={id}
              onDoubleClick={() => open(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") open(id);
              }}
            >
              <AppIcon id={id} size={30} />
              <span>{appById(id).name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="desktop-bottom-caption">
        <span className="mini-orbit">◉</span>
        <span>Find your orbit.</span>
        <span className="caption-line" />
        DESIGNED FOR THE EVERYDAY
      </div>
      <div className="wallpaper-credit">
        <span>{wallpaper.name}</span>
        <small>Somewhere worth slowing down.</small>
        <button aria-label="Change wallpaper" onClick={() => open("settings")}>
          <Image size={15} />
        </button>
      </div>
      {os.windows.map((w) => (
        <Window win={w} key={w.id} />
      ))}
      {os.error && (
        <div className="fatal-error">
          Storage could not initialize: {os.error}. Enable browser storage and
          reload.
        </div>
      )}
      {panel && (
        <>
          <div className="panel-dismiss" onClick={() => setPanel(null)} />
          {(panel === "launcher" || panel === "search") && (
            <section className="panel launcher">
              <div className="launcher-search">
                <Search size={19} />
                <input
                  autoFocus
                  aria-label="Search apps and files"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your apps, files, and a little inspiration…"
                />
                <kbd>⌘ Space</kbd>
              </div>
              <div className="launcher-heading">
                <div>
                  <h3>
                    {query ? "Search results" : "Your everyday essentials"}
                  </h3>
                  <p>
                    {query
                      ? "A little closer to what you need."
                      : "Everything you need, a click away."}
                  </p>
                </div>
                <span>{results.length} APPS</span>
              </div>
              <div className="launcher-grid">
                {results.map((a) => (
                  <button onClick={() => open(a.id)} key={a.id}>
                    <AppIcon id={a.id} size={27} />
                    <span>{a.name}</span>
                  </button>
                ))}
              </div>
              {fileResults.length > 0 && (
                <div className="search-files">
                  <h3>Files</h3>
                  {fileResults.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        os.openFile(f);
                        setPanel(null);
                      }}
                    >
                      <Image size={16} />
                      {f.name}
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              )}
              {!results.length && !fileResults.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <p>No results. Try another search.</p>
                </div>
              )}
              <div className="launcher-footer">
                <div className="avatar">A</div>
                <div>
                  <strong>Alex Morgan</strong>
                  <small>Your personal space</small>
                </div>
                <button
                  aria-label="Open Settings"
                  onClick={() => open("settings")}
                >
                  <Settings size={19} />
                </button>
                <button
                  aria-label="Session controls"
                  onClick={() => setConfirmPower(true)}
                >
                  <Power size={18} />
                </button>
              </div>
            </section>
          )}
          {panel === "quick" && (
            <section className="panel quick-panel">
              <div className="panel-heading">
                <h3>Little adjustments.</h3>
                <button
                  aria-label="Open Settings"
                  onClick={() => open("settings")}
                >
                  <Settings size={18} />
                </button>
              </div>
              <div className="quick-buttons">
                <button
                  className={os.preferences.wifi ? "on" : ""}
                  onClick={() =>
                    os.setPreferences((p) => ({ ...p, wifi: !p.wifi }))
                  }
                >
                  {os.preferences.wifi ? <Wifi /> : <WifiOff />}
                  <span>Wi-Fi</span>
                  <small>{os.preferences.wifi ? "Connected" : "Off"}</small>
                </button>
                <button
                  className={os.preferences.bluetooth ? "on" : ""}
                  onClick={() =>
                    os.setPreferences((p) => ({
                      ...p,
                      bluetooth: !p.bluetooth,
                    }))
                  }
                >
                  <Bluetooth />
                  <span>Bluetooth</span>
                  <small>{os.preferences.bluetooth ? "On" : "Off"}</small>
                </button>
                <button
                  onClick={() =>
                    os.setPreferences((p) => ({
                      ...p,
                      theme: p.theme === "light" ? "dark" : "light",
                    }))
                  }
                >
                  {os.preferences.theme === "light" ? <Sun /> : <Moon />}
                  <span>Appearance</span>
                  <small>{os.preferences.theme} mode</small>
                </button>
              </div>
              <label className="slider-row">
                <Sun size={19} />
                <input
                  aria-label="Desktop brightness"
                  type="range"
                  min="25"
                  max="100"
                  value={os.preferences.brightness}
                  onChange={(e) =>
                    os.setPreferences((p) => ({
                      ...p,
                      brightness: +e.target.value,
                    }))
                  }
                />
                <span>{os.preferences.brightness}%</span>
              </label>
              <label className="slider-row">
                <Volume2 size={19} />
                <input
                  aria-label="Master volume"
                  type="range"
                  value={os.preferences.volume}
                  onChange={(e) =>
                    os.setPreferences((p) => ({
                      ...p,
                      volume: +e.target.value,
                    }))
                  }
                />
                <span>{os.preferences.volume}%</span>
              </label>
              <footer>
                <BatteryFull size={19} />
                Browser session <span>Hardware managed by your device</span>
              </footer>
            </section>
          )}
          {panel === "notifications" && (
            <section className="panel notifications-panel">
              <div className="panel-heading">
                <h3>A moment to catch up.</h3>
                <button onClick={() => os.setNotices([])}>Clear all</button>
              </div>
              <div className="notification-date">
                {clock.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
                <strong>
                  {clock.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
              <div className="notice-list">
                {os.notices.map((n) => (
                  <article key={n.id}>
                    <span className="notification-icon">
                      <Bell size={17} />
                    </span>
                    <div>
                      <small>
                        ORBIT ·{" "}
                        {new Date(n.time).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                      <h4>{n.title}</h4>
                      <p>{n.message}</p>
                    </div>
                    <button
                      aria-label="Dismiss notification"
                      onClick={() =>
                        os.setNotices((ns) => ns.filter((x) => x.id !== n.id))
                      }
                    >
                      <X size={14} />
                    </button>
                  </article>
                ))}
                {!os.notices.length && (
                  <div className="empty-state">
                    <Check size={30} />
                    <h3>You’re all caught up.</h3>
                    <p>A little less noise. A little more space.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
      {context && (
        <>
          <div className="context-dismiss" onClick={() => setContext(null)} />
          <div
            className="context-menu"
            style={{ left: context.x, top: context.y }}
          >
            <span>YOUR DESKTOP</span>
            <button
              onClick={() => {
                setShowIcons(!showIcons);
                setContext(null);
              }}
            >
              <Grid2X2 size={16} />
              {showIcons ? "Hide" : "Show"} desktop icons
            </button>
            <button
              onClick={() => {
                setContext(null);
                os.notify("Desktop refreshed", "Your workspace is up to date.");
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => {
                void fs
                  .create(
                    fs.ROOT,
                    `New folder ${Date.now().toString().slice(-4)}`,
                    "folder",
                  )
                  .then(() => os.open("files"))
                  .catch((e) =>
                    os.notify("Could not create folder", e.message),
                  );
                setContext(null);
              }}
            >
              <FolderPlus size={16} />
              New folder
            </button>
            <hr />
            <button
              onClick={() => {
                open("settings");
                setContext(null);
              }}
            >
              <Image size={16} />
              Change wallpaper
            </button>
            <button
              onClick={() => {
                open("settings");
                setContext(null);
              }}
            >
              <Settings size={16} />
              Desktop settings
            </button>
          </div>
        </>
      )}
      {toast && !panel && os.notices[0]?.id !== "welcome" && (
        <div className="toast">
          <Bell size={18} />
          <div>
            <strong>{os.notices[0]?.title}</strong>
            <p>{os.notices[0]?.message}</p>
          </div>
          <button aria-label="Dismiss toast" onClick={() => setToast(false)}>
            <X size={15} />
          </button>
        </div>
      )}
      <footer className="dock-container">
        <div className="dock">
          <button
            className={`dock-launcher ${panel === "launcher" ? "dock-active" : ""}`}
            aria-label="Open app launcher"
            onClick={() => toggle("launcher")}
          >
            <span className="launcher-symbol">
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
          <button
            className="dock-search"
            aria-label="Open search"
            onClick={() => toggle("search")}
          >
            <Search size={23} />
          </button>
          <span className="dock-divider" />
          {(
            [
              "files",
              "browser",
              "notes",
              "music",
              "images",
              "terminal",
              "store",
              "settings",
            ] as AppId[]
          ).map((id) => {
            const running = os.windows.filter((w) => w.app === id);
            return (
              <button
                key={id}
                className={`dock-app ${running.length ? "running" : ""}`}
                aria-label={`Open ${appById(id).name}`}
                onClick={() => {
                  const w = running.sort((a, b) => b.z - a.z)[0];
                  if (
                    w &&
                    !w.minimized &&
                    w.z === Math.max(...os.windows.map((x) => x.z))
                  )
                    os.patch(w.id, { minimized: true });
                  else os.open(id);
                }}
              >
                <AppIcon id={id} size={25} />
                <span className="dock-tooltip">{appById(id).name}</span>
              </button>
            );
          })}
          {os.windows
            .filter(
              (w) =>
                ![
                  "files",
                  "browser",
                  "notes",
                  "music",
                  "images",
                  "terminal",
                  "store",
                  "settings",
                ].includes(w.app),
            )
            .filter((w, i, arr) => arr.findIndex((x) => x.app === w.app) === i)
            .map((w) => (
              <button
                key={w.app}
                className="dock-app running"
                aria-label={`Open ${appById(w.app).name}`}
                onClick={() => os.open(w.app)}
              >
                <AppIcon id={w.app} size={25} />
              </button>
            ))}
          <span className="dock-divider" />
          <button
            className="dock-tray"
            aria-label="System tray"
            onClick={() => toggle("quick")}
          >
            <div>
              {os.preferences.wifi ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
              {os.preferences.volume ? (
                <Volume2 size={14} />
              ) : (
                <VolumeX size={14} />
              )}
            </div>
            <span>
              {clock.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </button>
          <button
            className="dock-notifications"
            aria-label="Notifications"
            onClick={() => toggle("notifications")}
          >
            <Bell size={18} />
            {os.notices.length > 0 && <i />}
          </button>
        </div>
        <div className="dock-caption">
          <span className="status-dot" />
          All yours. All here.
        </div>
      </footer>
      {confirmPower && (
        <div className="modal-backdrop power-modal">
          <div className="dialog">
            <Power size={26} />
            <h3>Take a little pause.</h3>
            <p>
              Your files and settings stay saved. Reloading closes all
              application windows.
            </p>
            <div>
              <button onClick={() => setConfirmPower(false)}>Keep going</button>
              <button className="primary" onClick={() => location.reload()}>
                Restart desktop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
