"use client";

import clsx from "clsx";
import { ChatMessage as ChatMessageType } from "../lib/apiMock";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex w-full text-sm", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition",
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white text-neutral-900 border border-neutral-200 rounded-bl-sm"
        )}
      >
        <p className="font-medium capitalize text-xs text-neutral-200">
          {isUser ? "사용자" : "말로 어시스턴트"}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-inherit">{message.content}</p>
        <p className="mt-2 text-[11px] text-neutral-300">{new Date(message.createdAt).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

