import { createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useWorkspace, type Workspace } from "./useWorkspace";
import { useSession } from "./Session";
import { DesktopProvider } from "../core/store";
import Desktop from "../components/Desktop";
import "../style.css";
import "./desktop.css";
const WorkspaceContext = createContext<Workspace | null>(null);
export function useCloudWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw Error("Missing hosted workspace");
  return value;
}
function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspace();
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
function DesktopSession() {
  const session = useSession();
  return (
    <>
      <Desktop />
      {session.toast && (
        <div role="status" className="cloud-toast desktop-cloud-toast">
          <CheckCircle2 size={19} />
          <span>{session.toast}</span>
          <button
            aria-label="Dismiss message"
            onClick={() => session.setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
export default function DesktopHost() {
  return (
    <WorkspaceProvider>
      <DesktopProvider>
        <DesktopSession />
      </DesktopProvider>
    </WorkspaceProvider>
  );
}
