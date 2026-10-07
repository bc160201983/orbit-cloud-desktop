import { useState, useRef, useEffect } from "react";
import {
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Image,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Upload,
  Video,
} from "lucide-react";
import { useOS } from "../core/store";
import type { AppWindow } from "../core/types";
export function ImageViewer({ win }: { win: AppWindow }) {
  const { files } = useOS();
  const images = files.filter((f) => f.mime.startsWith("image"));
  const [index, setIndex] = useState(
    Math.max(
      0,
      images.findIndex((f) => f.id === win.fileId),
    ),
  );
  const [zoom, setZoom] = useState(1);
  const f = images[index];
  return (
    <div className="image-app">
      <div className="app-toolbar">
        <Image size={17} />
        <span>{f?.name || "No images yet"}</span>
        <div className="spacer" />
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
        >
          <ZoomOut size={18} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(4, zoom + 0.25))}
        >
          <ZoomIn size={18} />
        </button>
      </div>
      <div className="image-stage">
        {f ? (
          <img
            src={f.content}
            alt={f.name}
            style={{ transform: `scale(${zoom})` }}
          />
        ) : (
          <div className="empty-state">
            <Image size={40} />
            <p>Add images to Pictures using Files.</p>
          </div>
        )}
      </div>
      <footer>
        <button
          aria-label="Previous image"
          onClick={() => {
            setIndex((index - 1 + images.length) % images.length);
            setZoom(1);
          }}
          disabled={!images.length}
        >
          <ChevronLeft />
        </button>
        <span>
          {images.length ? index + 1 : 0} of {images.length}
        </span>
        <button
          aria-label="Next image"
          onClick={() => {
            setIndex((index + 1) % images.length);
            setZoom(1);
          }}
          disabled={!images.length}
        >
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}
function useLocalMedia(initial: string) {
  const [src, setSrc] = useState(initial);
  const [name, setName] = useState("");
  const blob = useRef("");
  useEffect(
    () => () => {
      if (blob.current) URL.revokeObjectURL(blob.current);
    },
    [],
  );
  const upload = (f: File | undefined) => {
    if (f) {
      if (blob.current) URL.revokeObjectURL(blob.current);
      blob.current = URL.createObjectURL(f);
      setSrc(blob.current);
      setName(f.name);
    }
  };
  return { src, name, upload };
}
export function MusicPlayer({ win }: { win: AppWindow }) {
  const os = useOS();
  const tracks = os.files.filter((f) => f.mime.startsWith("audio"));
  const [index, setIndex] = useState(
    Math.max(
      0,
      tracks.findIndex((f) => f.id === win.fileId),
    ),
  );
  const media = useLocalMedia("");
  const src = media.src || tracks[index]?.content || "";
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [liked, setLiked] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audio.current) audio.current.volume = os.preferences.volume / 100;
  }, [os.preferences.volume]);
  const next = (direction: number) => {
    if (tracks.length)
      setIndex(
        shuffle
          ? Math.floor(Math.random() * tracks.length)
          : (index + direction + tracks.length) % tracks.length,
      );
  };
  const toggle = async () => {
    if (!src) return;
    try {
      if (playing) audio.current?.pause();
      else await audio.current?.play();
      setError("");
    } catch {
      setError("This audio file could not be played. Choose a supported file.");
    }
  };
  const format = (n: number) =>
    `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  return (
    <div className="music-app">
      <div className="music-top">
        <span className="eyebrow">YOUR DAILY SOUNDTRACK</span>
        <label className="button">
          <Upload size={15} />
          Open audio
          <input
            hidden
            type="file"
            accept="audio/*"
            onChange={(e) => media.upload(e.target.files?.[0])}
          />
        </label>
      </div>
      <div className="album-art">
        <div className="record">
          <div>
            o<span>orbit sessions</span>
          </div>
        </div>
        <span className="album-caption">
          SLOW DOWN.
          <br />
          TUNE IN.
        </span>
      </div>
      <div className="track-info">
        <div>
          <h2>
            {media.name || tracks[index]?.name || "Your next favorite sound"}
          </h2>
          <p>
            {src ? "Local collection" : "Open an audio file to start listening"}
          </p>
        </div>
        <button
          aria-label="Favorite track"
          className={liked ? "liked" : ""}
          onClick={() => setLiked(!liked)}
        >
          <Heart fill={liked ? "currentColor" : "none"} size={21} />
        </button>
      </div>
      <audio
        ref={audio}
        src={src || undefined}
        loop={repeat}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setTime(audio.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audio.current?.duration || 0)}
        onEnded={() => {
          setPlaying(false);
          next(1);
        }}
        onError={() => setError("Unable to load this audio file.")}
      />
      <input
        aria-label="Playback position"
        type="range"
        min="0"
        max={duration || 1}
        value={time}
        onChange={(e) => {
          if (audio.current) audio.current.currentTime = +e.target.value;
        }}
      />
      <div className="track-time">
        <span>{format(time)}</span>
        <span>{format(duration)}</span>
      </div>
      <div className="player-controls">
        <button
          aria-label="Shuffle"
          className={shuffle ? "active" : ""}
          onClick={() => setShuffle(!shuffle)}
        >
          <Shuffle size={18} />
        </button>
        <button aria-label="Previous track" onClick={() => next(-1)}>
          <SkipBack size={21} />
        </button>
        <button
          className="play"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!src}
          onClick={() => void toggle()}
        >
          {playing ? (
            <Pause fill="currentColor" />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
        <button aria-label="Next track" onClick={() => next(1)}>
          <SkipForward size={21} />
        </button>
        <button
          aria-label="Repeat"
          className={repeat ? "active" : ""}
          onClick={() => setRepeat(!repeat)}
        >
          <Repeat size={18} />
        </button>
      </div>
      {error && <p className="inline-error">{error}</p>}
      {tracks.length > 0 && (
        <select
          aria-label="Select track"
          value={index}
          onChange={(e) => setIndex(+e.target.value)}
        >
          {tracks.map((f, i) => (
            <option key={f.id} value={i}>
              {f.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
export function VideoPlayer({ win }: { win: AppWindow }) {
  const os = useOS();
  const file = os.files.find((f) => f.id === win.fileId);
  const media = useLocalMedia(file?.content || "");
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.volume = os.preferences.volume / 100;
  }, [os.preferences.volume, media.src]);
  return (
    <div className="video-app">
      <div className="app-toolbar">
        <Video size={18} />
        <span>{media.name || file?.name || "Cinema, in your space"}</span>
        <div className="spacer" />
        <label className="button">
          <Upload size={16} />
          Open video
          <input
            hidden
            type="file"
            accept="video/*"
            onChange={(e) => media.upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {media.src ? (
        <video ref={video} src={media.src} controls />
      ) : (
        <div className="empty-state">
          <div className="large-icon">
            <Play size={40} />
          </div>
          <h2>Settle in. Press play.</h2>
          <p>Open a video from your device, or add one to Videos in Files.</p>
        </div>
      )}
    </div>
  );
}
