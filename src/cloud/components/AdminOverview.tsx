import {
  Users,
  Folder,
  HardDrive,
  Link2,
  ShieldCheck,
  Activity,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { bytes } from "../api";
import type { AdminData } from "../adminTypes";
import { AuditList } from "./AuditList";
export default function AdminOverview({
  data,
  setTab,
}: {
  data: AdminData;
  setTab: (tab: string) => void;
}) {
  return (
    <>
      <div className="overview-stats admin-stats">
        {[
          {
            title: "Workspace members",
            value: data.stats.users,
            icon: Users,
            color: "blue",
          },
          {
            title: "Hosted files",
            value: data.stats.files,
            icon: Folder,
            color: "purple",
          },
          {
            title: "Total storage",
            value: bytes(data.stats.storage),
            icon: HardDrive,
            color: "mint",
          },
          {
            title: "Sharing connections",
            value: data.stats.shares,
            icon: Link2,
            color: "peach",
          },
        ].map((s) => (
          <div className="overview-stat" key={s.title}>
            <div className={`stat-icon stat-${s.color}`}>
              <s.icon size={19} />
            </div>
            <span>{s.title}</span>
            <strong>{s.value}</strong>
            <small>Across your entire workspace</small>
          </div>
        ))}
      </div>
      <div className="admin-overview-columns">
        <section className="settings-section">
          <h3>
            <ShieldCheck size={18} />
            Workspace at a glance
          </h3>
          {[
            {
              name: "Member registration",
              on: data.settings.registrationEnabled,
            },
            {
              name: "Public link sharing",
              on: data.settings.publicSharing,
            },
            {
              name: "Maintenance mode",
              on: data.settings.maintenanceMode,
            },
          ].map((s) => (
            <div className="admin-status-row" key={s.name}>
              <span>{s.name}</span>
              <span className={`status-badge ${s.on ? "active" : ""}`}>
                {s.on ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
          <div className="admin-status-row">
            <span>Default storage per member</span>
            <strong>{data.settings.defaultQuotaMB} MB</strong>
          </div>
          <div className="admin-status-row">
            <span>Maximum upload size</span>
            <strong>{data.settings.maxUploadMB} MB</strong>
          </div>
          <button
            className="cloud-secondary"
            onClick={() => setTab("Settings")}
          >
            <SlidersHorizontal size={15} />
            Manage workspace settings
          </button>
        </section>
        <section className="settings-section">
          <h3>
            <Activity size={18} />
            Latest activity
          </h3>
          <AuditList items={data.activity.slice(0, 5)} />
          <button className="text-action" onClick={() => setTab("Audit log")}>
            View full audit log
            <ArrowUpRight size={14} />
          </button>
        </section>
      </div>
    </>
  );
}
