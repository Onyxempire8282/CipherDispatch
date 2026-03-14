import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { supabaseCD } from "../lib/supabaseCD";
import {
  CUSTOMER_SCRIPTS,
  FIRM_SCRIPTS,
  interpolateScript,
  ScriptTemplate,
} from "./claimMessageScripts";
import "./claim-message-thread.css";

const WEBHOOK_OUTBOUND_SMS = "REPLACE_WITH_N8N_OUTBOUND_WEBHOOK";

interface ClaimMessageThreadProps {
  claimId: string;
  claimData: Record<string, any>;
  currentUser: { name: string; role: string };
  messageType: "customer" | "firm";
}

interface Message {
  id: string;
  claim_id: string;
  author_name: string;
  author_role: string;
  body: string;
  message_type: string;
  created_at: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " \u00b7 " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClaimMessageThread({
  claimId,
  claimData,
  currentUser,
  messageType,
}: ClaimMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [selectedScript, setSelectedScript] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const scripts: ScriptTemplate[] =
    messageType === "customer" ? CUSTOMER_SCRIPTS : FIRM_SCRIPTS;

  const fetchMessages = async () => {
    const { data } = await supabaseCD
      .from("claim_messages")
      .select("*")
      .eq("claim_id", claimId)
      .or(`message_type.eq.${messageType},message_type.eq.system`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    fetchMessages();

    // Realtime subscription
    const channel = supabaseCD
      .channel(`claim-messages-${messageType}-${claimId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "claim_messages",
          filter: `claim_id=eq.${claimId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            newMsg.message_type === messageType ||
            newMsg.message_type === "system"
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseCD.removeChannel(channel);
    };
  }, [claimId, messageType]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScriptChange = (value: string) => {
    setSelectedScript(value);
    if (!value) return;
    const idx = parseInt(value, 10);
    const script = scripts[idx];
    if (script) {
      setBody(interpolateScript(script.body, claimData));
    }
  };

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setError("");

    const { error: insertErr } = await supabaseCD.from("claim_messages").insert({
      claim_id: claimId,
      author_name: currentUser.name,
      author_role: currentUser.role,
      body: body.trim(),
      message_type: messageType,
    });

    if (insertErr) {
      setError("Failed to save. Try again.");
      setSaving(false);
      return;
    }

    // Fire SMS webhook for customer messages only
    if (messageType === "customer" && WEBHOOK_OUTBOUND_SMS !== "REPLACE_WITH_N8N_OUTBOUND_WEBHOOK") {
      fetch(WEBHOOK_OUTBOUND_SMS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          claim_number: claimData.claim_number,
          customer_name: claimData.customer_name,
          customer_phone: claimData.customer_phone,
          message_body: body.trim(),
          sent_by: currentUser.name,
          sent_at: new Date().toISOString(),
        }),
      }).catch((err) => console.error("SMS webhook failed:", err));
    }

    setBody("");
    setSelectedScript("");
    setSaving(false);
    await fetchMessages();
  };

  const emptyText =
    messageType === "customer"
      ? "No customer messages yet. Select a script or type a message."
      : "No firm messages yet. Select a script or type a message.";

  const dropdownLabel =
    messageType === "customer"
      ? "INSERT CUSTOMER SCRIPT"
      : "INSERT FIRM SCRIPT";

  const submitLabel =
    messageType === "customer"
      ? "LOG CUSTOMER MESSAGE"
      : "LOG FIRM MESSAGE";

  const placeholder =
    messageType === "customer"
      ? "Type a message to the customer..."
      : "Type a note or firm communication...";

  return (
    <div>
      <div className="msg-thread" ref={threadRef}>
        {messages.length === 0 ? (
          <div className="msg-thread__empty">{emptyText}</div>
        ) : (
          messages.map((msg) =>
            msg.message_type === "system" ? (
              <div key={msg.id} className="msg-entry msg-entry--system">
                <span className="msg-entry__time">
                  {formatTimestamp(msg.created_at)}
                </span>
                <div className="msg-entry__body">{msg.body}</div>
              </div>
            ) : (
              <div key={msg.id} className="msg-entry">
                <div className="msg-entry__meta">
                  <span className="msg-entry__author">{msg.author_name}</span>
                  <span className="msg-entry__role">{msg.author_role}</span>
                  <span className="msg-entry__time">
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>
                <div className="msg-entry__body">{msg.body}</div>
              </div>
            )
          )
        )}
      </div>

      <div className="msg-compose">
        <select
          className="msg-compose__select"
          value={selectedScript}
          onChange={(e) => handleScriptChange(e.target.value)}
        >
          <option value="">{dropdownLabel}</option>
          {scripts.map((s, i) => (
            <option key={i} value={String(i)}>
              {s.label}
            </option>
          ))}
        </select>

        <textarea
          className="msg-compose__textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
        />

        <div className="msg-compose__row">
          {error && <span className="msg-compose__error">{error}</span>}
          <button
            className="msg-compose__submit"
            onClick={handleSubmit}
            disabled={saving || !body.trim()}
          >
            {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
