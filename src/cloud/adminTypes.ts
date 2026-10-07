import type {
  WorkspaceSettings,
  User,
  Activity as Audit,
  CloudFile,
} from "./types";
export interface AdminData {
  stats: { users: number; files: number; storage: number; shares: number };
  settings: WorkspaceSettings;
  users: User[];
  activity: Audit[];
  files: CloudFile[];
  shares: {
    id: string;
    name: string;
    ownerName: string;
    downloads: number;
    recipient: string | null;
    expires: number | null;
    created: number;
  }[];
}
