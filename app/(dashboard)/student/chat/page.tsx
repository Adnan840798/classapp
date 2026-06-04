import { ChatWindow } from '@/components/features/ChatWindow';

export default function StudentChatPage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Student Chat Room</h1>
        <p className="page-subtitle">Send text messages and ask quick questions to your classmates</p>
      </div>

      <ChatWindow role="student" />
    </div>
  );
}
