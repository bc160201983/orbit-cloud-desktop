export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  quota: number;
  used: number;
  created: number;
}
export interface CloudFile {
  id: string;
  owner: string;
  parent: string | null;
  name: string;
  kind: "file" | "folder";
  mime: string;
  size: number;
  starred: boolean;
  trashed: boolean;
  created: number;
  modified: number;
  ownerName?: string;
  ownerEmail?: string;
}
export interface Share {
  id: string;
  file_id: string;
  owner: string;
  token: string;
  recipient: string | null;
  expires: number | null;
  downloads: number;
  max_downloads: number | null;
  created: number;
  protected: boolean;
  name: string;
  size: number;
  mime: string;
  ownerName: string;
  ownerEmail: string;
}
export interface WorkspaceSettings {
  workspaceName: string;
  tagline: string;
  registrationEnabled: boolean;
  publicSharing: boolean;
  maintenanceMode: boolean;
  defaultQuotaMB: number;
  maxUploadMB: number;
  trashRetentionDays: number;
  allowedExtensions: string;
}
export interface Activity {
  id?: string;
  action: string;
  detail: string;
  created: number;
  actorName?: string;
}
export interface Status {
  initialized: boolean;
  workspaceName: string;
  tagline: string;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  user: User | null;
}
export type View =
  | "overview"
  | "files"
  | "shared"
  | "links"
  | "favorites"
  | "recent"
  | "trash"
  | "activity"
  | "settings"
  | "admin";
