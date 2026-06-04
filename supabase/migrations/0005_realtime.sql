-- ============================================================
-- 0005_realtime.sql — ClassApp: Enable Realtime for Chat & Notifications
-- ============================================================
-- Enables Realtime websocket broadcasts on these tables.
-- ============================================================

-- Add chat_messages table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Add notifications table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
