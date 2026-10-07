import { Cloud, RotateCw } from "lucide-react";
import { SessionProvider, useSession } from "./Session";
import Login from "./pages/Login";
import PublicShare from "./pages/PublicShare";
import DesktopHost from "./DesktopHost";
import "./base.css";
import "./cloud.css";
function Router() {
  const session = useSession();
  const share = location.pathname.match(/^\/s\/([a-f0-9]{48})$/);
  if (!session.status)
    return (
      <div className="cloud-loading">
        <span className="cloud-brand-icon">
          <Cloud size={30} />
        </span>
        <h2>
          {session.error
            ? "A little connection trouble."
            : "Finding your orbit…"}
        </h2>
        <p>{session.error || "Your space is just a moment away."}</p>
        {session.error && (
          <button
            className="cloud-primary"
            onClick={() => void session.refresh()}
          >
            <RotateCw size={16} />
            Try again
          </button>
        )}
      </div>
    );
  if (share) return <PublicShare token={share[1]} />;
  return session.status.user ? (
    <DesktopHost key={session.status.user.id} />
  ) : (
    <Login />
  );
}
export default function CloudApp() {
  return (
    <SessionProvider>
      <Router />
    </SessionProvider>
  );
}
