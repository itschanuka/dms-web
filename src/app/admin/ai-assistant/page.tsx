"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { useTheme } from "@/lib/theme";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "agent",
  text: "Hello! I'm your Auto Prime AI Assistant. Ask me anything about vehicles, customers, deals, or payments.",
  timestamp: new Date(),
};

export default function AIAssistantPage() {
  const t = useTheme();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text, timestamp: new Date() },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${AGENT_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error("Agent unavailable");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "agent", text: data.reply, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          text: "Agent is unavailable. Please try again later.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void sendMessage();
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminShell activeKey="ai-assistant">
      <div style={{ height: "calc(100vh - 56px)", background: t.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "18px 28px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #0ea5e9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>
            AI
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text }}>AI Assistant</h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: t.muted }}>Auto Prime Dealership Intelligence</p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 5 }}>
                <div
                  style={{
                    padding: "12px 15px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: msg.role === "user" ? "#2563eb" : t.card,
                    color: msg.role === "user" ? "#fff" : t.text,
                    border: msg.role === "user" ? "none" : `1px solid ${t.border}`,
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: 11, color: t.muted, padding: "0 4px" }}>{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: "16px 16px 16px 4px", padding: "13px 15px", color: t.muted, fontSize: 13 }}>
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div style={{ background: t.card, borderTop: `1px solid ${t.border}`, padding: "16px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 12, maxWidth: 980, margin: "0 auto" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about vehicles, deals, customers, payments..."
              disabled={loading}
              style={{ flex: 1, border: `1px solid ${t.border}`, borderRadius: 999, padding: "12px 18px", fontSize: 13, outline: "none", color: t.text, background: t.inputBg }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: loading || !input.trim() ? "#64748b" : "#2563eb", color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: 18, fontWeight: 800 }}
            >
              &gt;
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: t.muted, margin: "9px 0 0" }}>
            AI can make mistakes. Verify important data directly in the system.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
