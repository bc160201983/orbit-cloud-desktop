import type { AppWindow } from "../core/types";
import Files from "./Files";
import Settings from "./Settings";
import Terminal from "./Terminal";
import Editor from "./Editor";
import Calculator from "./Calculator";
import { ImageViewer, MusicPlayer, VideoPlayer } from "./Media";
import { Browser } from "./Browser";
import { Notes } from "./Notes";
import { Monitor } from "./Monitor";
import { Store } from "./Store";
export default function AppContent({ win }: { win: AppWindow }) {
  switch (win.app) {
    case "files":
      return <Files win={win} />;
    case "settings":
      return <Settings />;
    case "terminal":
      return <Terminal />;
    case "editor":
      return <Editor win={win} />;
    case "calculator":
      return <Calculator />;
    case "images":
      return <ImageViewer win={win} />;
    case "music":
      return <MusicPlayer win={win} />;
    case "video":
      return <VideoPlayer win={win} />;
    case "browser":
      return <Browser />;
    case "notes":
      return <Notes />;
    case "monitor":
      return <Monitor />;
    case "store":
      return <Store />;
  }
}
