"use client";

import { useMemo, useState } from "react";
import { ChatMessage as ChatMessageType, OrderDraft, callParseApi, confirmOrder } from "../../lib/apiMock";
import { ChatMessage } from "../../components/ChatMessage";
import { OrderSummaryCard } from "../../components/OrderSummaryCard";
import { useMockSTT } from "../../hooks/useMockSTT";
import { useSessionId } from "../../hooks/useSessionId";

export default function KioskPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const stt = useMockSTT();
  const { sessionId, resetSession } = useSessionId();

  const hasMessages = useMemo(() => messages.length > 0, [messages]);

  async function handleSend() {
    if (!currentInput.trim() || isLoading) return;
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      type: "text",
      content: currentInput,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);

    try {
      const result = await callParseApi(userMessage.content, sessionId ?? undefined);
      if (result.type === "ASK") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            type: "ask",
            content: result.message,
            createdAt: new Date().toISOString()
          }
        ]);
      } else {
        setDraft(result.draft);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            type: "draft",
            content: `${result.draft.items[0].label} 주문 초안을 생성했어요.`,
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!draft || isConfirming) return;
    setIsConfirming(true);
    const res = await confirmOrder(draft, sessionId ?? undefined);
    setIsConfirming(false);
    if (res.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "text",
          content: `주문이 확정되었어요! 주문번호 ${res.orderId}`,
          createdAt: new Date().toISOString()
        }
      ]);
      setDraft(null);
    }
  }

  function handleNewSession() {
    setMessages([]);
    setDraft(null);
    setCurrentInput("");
    resetSession();
  }

  function handleMic() {
    if (!stt.isRecording) {
      stt.start();
      setCurrentInput("");
    } else {
      const transcript = stt.stop();
      setCurrentInput(transcript);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="rounded-2xl bg-white p-6 shadow">
        <header className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-semibold">malro Kiosk – Order by speaking</h1>
          <p className="text-sm text-neutral-500">
            여기는 모의 프런트입니다. 실제 `/nl/parse` API 연결은 서버가 준비되면 교체할 예정입니다.
          </p>
        </header>
        <div className="mt-4 flex flex-col gap-4">
          <div className="h-80 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            {hasMessages ? (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-sm text-neutral-400">
                아직 대화가 없습니다. 음료를 입력하거나 마이크 버튼을 눌러보세요.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-xs text-neutral-500">
            다음 단계에서 Web Speech API · OpenAI LLM과 실제로 연결할 예정입니다.
          </div>

          <div className="flex gap-3">
            <input
              className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
              placeholder="예: 아이스 아메리카노 톨 사이즈 두 잔 포장"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? "분석 중..." : "보내기"}
            </button>
            <button
              type="button"
              onClick={handleMic}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                stt.isRecording ? "border-red-400 text-red-500 shadow-inner" : "border-neutral-300 text-neutral-600"
              }`}
            >
              {stt.isRecording ? "녹음 중..." : "🎤"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleNewSession}
            className="self-start text-sm text-neutral-500 underline decoration-dotted"
          >
            새 주문 시작
          </button>
        </div>
      </section>

      {draft ? (
        <OrderSummaryCard draft={draft} onConfirm={handleConfirm} isConfirming={isConfirming} />
      ) : (
        <aside className="rounded-2xl bg-white p-6 text-sm text-neutral-500 shadow">
          ORDER_DRAFT가 생성되면 이 영역에서 자세한 옵션/확정 버튼을 표시합니다.
        </aside>
      )}
    </div>
  );
}
