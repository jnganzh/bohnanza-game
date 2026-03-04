import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { socket } from '../../socket/socket';
import './ChatPanel.css';

export function ChatPanel() {
  const { messages, unreadCount, isOpen, setOpen } = useChatStore();
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('chat:message', { text: trimmed });
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        className="chat-toggle-btn"
        onClick={() => setOpen(!isOpen)}
        title="Chat"
      >
        💬
        {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Chat</span>
            <button className="chat-close-btn" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="chat-msg">
                <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                <span className="chat-msg-name">{msg.playerName}</span>
                <span className="chat-msg-text">{msg.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              maxLength={200}
            />
            <button className="chat-send-btn" onClick={send}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
