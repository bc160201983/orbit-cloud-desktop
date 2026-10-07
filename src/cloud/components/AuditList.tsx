import { Link2, Users, ShieldCheck, Folder } from "lucide-react";
import { relative } from "../api";
import type { Activity as Audit } from "../types";
export function AuditList({ items }: { items: Audit[] }) {
  return (
    <div className="audit-list">
      {items.map((a, i) => (
        <div key={a.id || i}>
          <span className="audit-icon">
            {a.action.includes("share") ? (
              <Link2 size={15} />
            ) : a.action.includes("account") ? (
              <Users size={15} />
            ) : a.action.includes("admin") ? (
              <ShieldCheck size={15} />
            ) : (
              <Folder size={15} />
            )}
          </span>
          <div>
            <strong>{a.action.split(".").join(" · ")}</strong>
            <p>{a.detail}</p>
            {a.actorName && <small>{a.actorName}</small>}
          </div>
          <time>{relative(a.created)}</time>
        </div>
      ))}
    </div>
  );
}
