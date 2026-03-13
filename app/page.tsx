"use client";

import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Fragment, useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  return (
    <main className="flex h-screen flex-col items-center">
      <div className="flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.map((message) => (
              <Fragment key={message.id}>
                <Message from={message.role}>
                  <MessageContent className={message.role === "assistant" ? "font-pixel" : ""}>
                    {message.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : null
                    )}
                  </MessageContent>
                </Message>
              </Fragment>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="flex justify-center p-4">
          <div className="w-full max-w-2xl">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Type a message..."
                value={input}
              />
              <PromptInputFooter>
                <div />
                <PromptInputSubmit onStop={stop} status={status} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </main>
  );
}
