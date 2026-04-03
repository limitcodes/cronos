"use client";

import { Fragment, use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
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
  Reasoning,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrainIcon, WrenchIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export default function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const sentInitial = useRef(false);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: `/api/chat/${chatId}` }),
  });
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const assistantHasText = Boolean(
    lastAssistantMessage?.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    ),
  );
  const assistantHasToolActivity = Boolean(
    lastAssistantMessage?.parts.some(
      (part) =>
        isToolUIPart(part) &&
        (part.state === "input-streaming" ||
          part.state === "input-available" ||
          part.state === "approval-requested" ||
          part.state === "approval-responded"),
    ),
  );
  const showThinkingIndicator = status === "submitted";
  const showToolIndicator =
    status === "streaming" && assistantHasToolActivity && !assistantHasText;

  // Load persisted messages
  useEffect(() => {
    fetch(`/api/chats/${chatId}`)
      .then((r) => r.json())
      .then(({ messages: saved }) => {
        if (saved?.length) {
          setMessages(
            saved.map((m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role,
              parts: [{ type: "text", text: m.content }],
            }))
          );
        }
      })
      .catch(() => {});
  }, [chatId, setMessages]);

  // Auto-send initial message from home page
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      sendMessage({ text: q });
      // Remove the query param from the URL without a reload
      window.history.replaceState(null, "", `/chat/${chatId}`);
    }
  }, [chatId, searchParams, sendMessage]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl">
          {messages.map((message) => (
              <Fragment key={message.id}>
                <Message from={message.role}>
                  <MessageContent
                    className={message.role === "assistant" ? "font-pixel" : ""}
                  >
                    {message.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : null
                    )}
                  </MessageContent>
                </Message>
              </Fragment>
            ))}
            {showThinkingIndicator || showToolIndicator ? (
              <Message from="assistant">
                <MessageContent className="font-pixel">
                  <Reasoning className="mb-0" isStreaming>
                    <ReasoningTrigger className="[&_svg]:hidden">
                      <>
                        {showToolIndicator ? (
                          <WrenchIcon className="size-4" />
                        ) : (
                          <BrainIcon className="size-4" />
                        )}
                        <Shimmer duration={1}>
                          {showToolIndicator ? "Calling tools..." : "Thinking..."}
                        </Shimmer>
                      </>
                    </ReasoningTrigger>
                  </Reasoning>
                </MessageContent>
              </Message>
            ) : null}
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
  );
}
