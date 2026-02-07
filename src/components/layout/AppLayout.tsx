import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatProvider } from "@/context/ChatContext";

export function AppLayout() {
  return (
    <ChatProvider>
      <div className="flex h-screen bg-tp-light">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden pb-14">
          <Outlet />
        </main>
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
