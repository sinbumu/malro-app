"use client";

import { useEffect, useMemo, useState } from "react";
import menuData from "../../../../artifacts/cafe/menu.json";
import { ChatMessage as ChatMessageType, OrderDraft, callParseApi, confirmOrder } from "../../lib/apiMock";
import { ChatMessage } from "../../components/ChatMessage";
import { OrderSummaryCard } from "../../components/OrderSummaryCard";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useSessionId } from "../../hooks/useSessionId";

type MenuSchemaItem = {
  sku: string;
  display: string;
  temps?: string[];
  base_price: Record<string, number>;
  sizes_enabled?: boolean;
  allow_options?: string[];
};

type MenuJson = {
  version: string;
  items: MenuSchemaItem[];
};

type MenuItemCardData = {
  sku: string;
  display: string;
  temps: string[];
  base_price: Record<string, number>;
  sizes_enabled: boolean;
  allow_options: string[];
};

const parsedMenu: MenuItemCardData[] = ((menuData as MenuJson).items ?? []).map((item) => ({
  sku: item.sku,
  display: item.display,
  temps: item.temps ?? [],
  base_price: item.base_price,
  sizes_enabled: Boolean(item.sizes_enabled),
  allow_options: item.allow_options ?? []
}));

export default function KioskPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const speech = useSpeechRecognition({
    lang: "ko-KR",
    onResult: (transcript, isFinal) => {
      if (!transcript) return;
      if (isFinal) {
        setLiveTranscript("");
        setCurrentInput((prev) => (prev ? `${prev.trim()} ${transcript}`.trim() : transcript));
      } else {
        setLiveTranscript(transcript);
      }
    }
  });
  const { sessionId, resetSession } = useSessionId();

  const hasMessages = useMemo(() => messages.length > 0, [messages]);
  const filteredMenu = useMemo(() => {
    const keyword = menuQuery.trim();
    if (!keyword) {
      return parsedMenu;
    }
    return parsedMenu.filter((item) => {
      const lower = keyword.toLowerCase();
      return item.display.includes(keyword) || item.sku.toLowerCase().includes(lower);
    });
  }, [menuQuery]);

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
    if (!speech.isSupported) {
      alert("이 브라우저 환경에서는 음성 입력을 사용할 수 없습니다. HTTPS 연결과 마이크 권한을 확인해 주세요.");
      return;
    }

    if (speech.isRecording) {
      speech.stop();
    } else {
      speech.start();
    }
  }

  useEffect(() => {
    if (!speech.isRecording) {
      setLiveTranscript("");
    }
  }, [speech.isRecording]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="rounded-2xl bg-white p-6 shadow">
        <header className="flex flex-col gap-3 border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">malro Kiosk – Order by speaking</h1>
              <p className="text-sm text-neutral-500">
                여기는 모의 프런트입니다. 실제 `/nl/parse` API 연결은 서버가 준비되면 교체할 예정입니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="rounded-2xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:border-blue-500 hover:text-blue-600"
              >
                메뉴판 보기
              </button>
            </div>
          </div>
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
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={handleMic}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  speech.isRecording ? "border-red-400 text-red-500 shadow-inner" : "border-neutral-300 text-neutral-600"
                }`}
              >
                {speech.isRecording ? "녹음 중..." : "🎤"}
              </button>
              {!speech.isSupported && (
                <span className="text-xs text-neutral-500">HTTPS 환경에서만 음성 입력을 사용할 수 있어요.</span>
              )}
              {speech.error && (
                <span className="text-xs text-red-500">{speech.error}</span>
              )}
            </div>
          </div>
          {speech.isRecording && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              🗣 실시간 인식: {liveTranscript || "듣고 있습니다..."}
            </div>
          )}
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
      {isMenuOpen ? (
        <MenuModal
          menuItems={filteredMenu}
          search={menuQuery}
          onSearchChange={setMenuQuery}
          onClose={() => setIsMenuOpen(false)}
        />
      ) : null}

    </div>
  );
}

function MenuModal({
  menuItems,
  search,
  onSearchChange,
  onClose
}: {
  menuItems: MenuItemCardData[];
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-[min(960px,95vw)] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">메뉴판</h2>
            <p className="text-sm text-neutral-500">LLM이 참고하는 메뉴 목록입니다.</p>
          </div>
          <button
            type="button"
            aria-label="메뉴판 닫기"
            onClick={onClose}
            className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-neutral-500"
          >
            닫기
          </button>
        </div>
        <div className="border-b px-6 py-4">
          <input
            className="w-full rounded-2xl border border-neutral-300 px-4 py-2 text-sm focus:border-blue-600 focus:outline-none"
            placeholder="예: 라떼, 에이드, 스무디 ..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {menuItems.length === 0 ? (
            <p className="text-sm text-neutral-500">검색어와 일치하는 메뉴가 없습니다.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {menuItems.map((item) => (
                <article key={item.sku} className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{item.display}</p>
                      <p className="text-xs text-neutral-400">{item.sku}</p>
                    </div>
                    {item.sizes_enabled ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        사이즈 선택
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
                        단일 사이즈
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-neutral-700">
                    {Object.entries(item.base_price).map(([temp, price]) => (
                      <div key={`${item.sku}-${temp}`} className="flex justify-between text-xs text-neutral-600">
                        <span>{formatTempLabel(temp)}</span>
                        <span className="font-semibold text-neutral-800">{formatPrice(price)}원</span>
                      </div>
                    ))}
                  </div>
                  {item.temps.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500">온도: {item.temps.join(", ")}</p>
                  )}
                  {item.allow_options.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-400">옵션: {item.allow_options.join(", ")}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTempLabel(value: string) {
  switch (value) {
    case "HOT":
      return "HOT (따뜻하게)";
    case "ICE":
      return "ICE (시원하게)";
    default:
      return value;
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
