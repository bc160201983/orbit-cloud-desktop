import { useEffect, useState } from "react";
import { Download, Share2, FileText, Image, FileCode2 } from "lucide-react";
import Modal from "./Modal";
import FileIcon from "./FileIcon";
import type { CloudFile } from "../types";
import { bytes } from "../api";
export default function Preview({
  file,
  onClose,
  onShare,
}: {
  file: CloudFile;
  onClose: () => void;
  onShare: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const url = `/api/files/${file.id}/preview`;
  const isText =
    file.mime.startsWith("text/") ||
    /\.(txt|md|json|csv|js|ts|tsx|css|html|py|mjs)$/.test(file.name);
  useEffect(() => {
    if (isText && file.size <= 1048576) {
      const controller = new AbortController();
      fetch(url, { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw Error("Preview is unavailable.");
          return r.text();
        })
        .then(setText)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => setLoading(false));
      return () => controller.abort();
    }
    setLoading(false);
  }, [file.id, isText, url]);
  return (
    <Modal
      wide
      title={file.name}
      subtitle={`${bytes(file.size)} · Only you and the people you share with`}
      onClose={onClose}
    >
      <div className="cloud-preview-stage">
        {file.mime.startsWith("image/") && !file.mime.includes("svg") ? (
          <img
            src={url}
            alt={file.name}
            onError={() =>
              setError(
                "This image cannot be previewed. Download the original instead.",
              )
            }
          />
        ) : file.mime.startsWith("video/") ? (
          <video src={url} controls />
        ) : file.mime.startsWith("audio/") ? (
          <div className="audio-preview">
            <FileIcon file={file} size={55} />
            <h3>{file.name}</h3>
            <audio src={url} controls />
          </div>
        ) : isText && file.size <= 1048576 ? (
          <pre>{loading ? "Loading your document…" : text}</pre>
        ) : (
          <div className="cloud-empty">
            <FileIcon file={file} size={49} />
            <h3>The original is ready for you.</h3>
            <p>
              {isText
                ? "This document is too large for inline preview."
                : "Download this file to view it in its native application."}
            </p>
          </div>
        )}
      </div>
      {error && <div className="cloud-error">{error}</div>}
      <div className="preview-actions">
        <button className="cloud-secondary" onClick={onShare}>
          <Share2 size={16} />
          Share file
        </button>
        <a
          className="cloud-primary"
          href={`/api/files/${file.id}/download`}
          download
        >
          <Download size={16} />
          Download original
        </a>
      </div>
    </Modal>
  );
}
