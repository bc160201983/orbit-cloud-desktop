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
export function Browser() {
  const [address, setAddress] = useState("");
  const [history, setHistory] = useState<string[]>([""]);
  const [index, setIndex] = useState(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const url = history[index];
  const go = (input: string) => {
    try {
      const u = new URL(input.includes("://") ? input : `https://${input}`);
      if (!["https:", "http:"].includes(u.protocol)) throw Error();
      setHistory([...history.slice(0, index + 1), u.href]);
      setIndex(index + 1);
      setAddress(u.href);
      setError("");
    } catch {
      setError("Enter a valid website address.");
    }
  };
  return (
    <div className="browser-app">
      <form
        className="browser-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          go(address);
        }}
      >
        <button
          type="button"
          aria-label="Go back"
          disabled={!index}
          onClick={() => {
            setIndex(index - 1);
            setAddress(history[index - 1]);
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="Go forward"
          disabled={index === history.length - 1}
          onClick={() => {
            setIndex(index + 1);
            setAddress(history[index + 1]);
          }}
        >
          <ArrowRight size={17} />
        </button>
        <button
          type="button"
          aria-label="Reload"
          onClick={() => setReload(reload + 1)}
        >
          <RotateCw size={16} />
        </button>
        <div className="address-bar">
          <Lock size={14} />
          <input
            aria-label="Website address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter a website address"
          />
          <button type="submit" aria-label="Visit website">
            <ArrowRight size={16} />
          </button>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in new tab"
          >
            <ExternalLink size={17} />
          </a>
        )}
      </form>
      {error && <p className="inline-error">{error}</p>}
      {url ? (
        <>
          <div className="browser-notice">
            Some websites prevent embedding.{" "}
            <a href={url} target="_blank" rel="noreferrer">
              Open in a new tab ↗
            </a>
          </div>
          <iframe
            key={url + reload}
            src={url}
            title="Browser page"
            sandbox="allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        </>
      ) : (
        <div className="browser-home">
          <div className="eyebrow">THE WORLD IS A CLICK AWAY</div>
          <h1>Stay curious.</h1>
          <p>A new perspective is always out there.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(
                "https://www.google.com/search?q=" +
                  encodeURIComponent(address),
              );
            }}
          >
            <Search size={20} />
            <input
              aria-label="Search the web"
              placeholder="Search the web"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button type="submit">
              <ArrowRight size={19} />
            </button>
          </form>
          <div className="web-shortcuts">
            {["Wikipedia", "GitHub", "MDN", "Unsplash"].map((n, i) => (
              <button
                key={n}
                onClick={() =>
                  go(
                    [
                      "https://en.wikipedia.org",
                      "https://github.com",
                      "https://developer.mozilla.org",
                      "https://unsplash.com",
                    ][i],
                  )
                }
              >
                <Globe size={23} />
                <span>{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
