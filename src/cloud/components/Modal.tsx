import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
export default function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return createPortal(
    <div className="cloud-app cloud-dialog-host">
      <div
        className="cloud-modal-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <section
          className={`cloud-modal ${wide ? "wide" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header>
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button
              className="cloud-icon-button"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </header>
          {children}
        </section>
      </div>
    </div>,
    document.body,
  );
}
