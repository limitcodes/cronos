"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: message.text.slice(0, 60) }),
    });
    if (res.ok) {
      const chat = await res.json();
      // Pass the initial message via query param so the chat page sends it
      router.push(`/chat/${chat.id}?q=${encodeURIComponent(message.text)}`);
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-end pb-4">
      <div className="w-full max-w-2xl px-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Start a new conversation…"
            value={input}
            disabled={loading}
          />
          <PromptInputFooter>
            <div />
            <PromptInputSubmit disabled={loading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
