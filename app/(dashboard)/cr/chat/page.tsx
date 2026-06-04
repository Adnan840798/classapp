import { ChatWindow } from '@/components/features/ChatWindow';

export default function CRChatPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">CR Chat Room</h1>
        <p className="page-subtitle">Interact with class members, pin notices, and manage messages</p>
      </div>

      <ChatWindow role="cr" />
    </div>
  );
}
