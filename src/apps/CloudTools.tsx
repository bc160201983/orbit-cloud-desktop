import { useState } from "react";
import { Link2, Users } from "lucide-react";
import { useCloudWorkspace } from "../cloud/DesktopHost";
import { useOS } from "../core/store";
import Account from "../cloud/pages/Account";
import Admin from "../cloud/pages/Admin";
import Sharing from "../cloud/pages/Sharing";
export function SharingApp() {
  const w = useCloudWorkspace();
  const [incoming, setIncoming] = useState(false);
  return (
    <div className="cloud-app desktop-cloud-app cloud-tool">
      <div className="hosted-tabs">
        <button
          className={!incoming ? "active" : ""}
          onClick={() => setIncoming(false)}
        >
          <Link2 size={17} />
          Shared links
        </button>
        <button
          className={incoming ? "active" : ""}
          onClick={() => setIncoming(true)}
        >
          <Users size={17} />
          Shared with me <span>{w.incoming.length}</span>
        </button>
      </div>
      <div className="hosted-content">
        <Sharing workspace={w} incoming={incoming} />
      </div>
    </div>
  );
}
export function AccountApp() {
  return (
    <div className="cloud-app desktop-cloud-app cloud-tool">
      <div className="hosted-content">
        <Account />
      </div>
    </div>
  );
}
export function AdminApp() {
  const os = useOS();
  return (
    <div className="cloud-app desktop-cloud-app cloud-tool">
      <div className="hosted-content">
        {os.user.role === "admin" ? (
          <Admin />
        ) : (
          <p>Administrator access required.</p>
        )}
      </div>
    </div>
  );
}
