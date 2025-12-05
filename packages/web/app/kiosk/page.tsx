"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const menuImages: Record<string, string> = {
  AMERICANO: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80",
  CAFE_LATTE: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=80",
  CARAMEL_MACCHIATO: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=400&q=80",
  MATCHA_LATTE: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
  CHAI_LATTE: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=80",
  EARL_GREY_TEA: "https://images.unsplash.com/photo-1464306076886-da185f6a9d12?auto=format&fit=crop&w=400&q=80",
  LEMON_ADE: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=400&q=80",
  STRAWBERRY_BANANA_SMOOTHIE: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=400&q=80",
  CROISSANT: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=400&q=80",
  CHOCOLATE_CAKE: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=400&q=80"
};

export default function KioskPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
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
            content:
              result.draft.items.length > 1
                ? `주문 초안을 업데이트했습니다. ${result.draft.items.length}개의 항목을 확인하신 뒤 확정해 주세요.`
                : "주문 초안을 생성했습니다. 옵션을 확인한 뒤 확정 버튼을 눌러주세요.",
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

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const nowLabel = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  const heroStats = useMemo(
    () => [
      { label: "현재 대기", value: draft ? draft.items.length : 0, helper: "대화 중 항목" },
      { label: "세션 ID", value: sessionId?.slice(0, 8) ?? "신규", helper: "익명 세션" },
      { label: "마이크", value: speech.isRecording ? "Listening" : "Idle", helper: liveTranscript ? "문장 수집 중" : "대기 중" }
    ],
    [draft, sessionId, speech.isRecording, liveTranscript]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-100 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl bg-white/90 p-6 shadow-xl shadow-amber-100 backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">malro flagship kiosk</p>
              <h1 className="mt-2 text-3xl font-bold text-neutral-900">음성으로 주문하고, AI가 정리합니다.</h1>
              <p className="mt-1 text-sm text-neutral-500">서울 성수점 · {nowLabel}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-neutral-200 px-4 py-3 text-left">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">{stat.label}</p>
                  <p className="text-xl font-semibold text-neutral-900">{stat.value}</p>
                  <p className="text-[11px] text-neutral-500">{stat.helper}</p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm hover:border-amber-400"
              >
                메뉴판 열기
              </button>
            </div>
          </header>
          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="flex flex-col gap-4">
              <div className="h-80 overflow-y-auto rounded-2xl border border-white/60 bg-gradient-to-br from-white to-amber-50/60 p-4 shadow-inner shadow-amber-100">
                {hasMessages ? (
                  <div className="flex flex-col gap-4">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={scrollAnchorRef} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-neutral-400">
                    아직 대화가 없습니다. 음료를 입력하거나 마이크 버튼을 눌러보세요.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-700">
                다음 단계에서 Web Speech API · OpenAI LLM과 실제 연결되어 데모를 진행합니다. 지금은 샘플 API + STT로 동작합니다.
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex flex-1 gap-3">
                  <input
                    className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow focus:border-amber-500 focus:outline-none"
                    placeholder="예: 아이스 아메리카노 두 잔이랑 케이크 하나 포장"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isLoading}
                    className="rounded-2xl bg-neutral-900 px-6 py-3 font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {isLoading ? "분석 중..." : "보내기"}
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow">
                  <button
                    type="button"
                    onClick={handleMic}
                    className={`rounded-full px-4 py-3 text-sm font-semibold ${
                      speech.isRecording
                        ? "bg-red-50 text-red-600 shadow-inner shadow-red-100"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {speech.isRecording ? "녹음 중..." : "🎤 음성 입력"}
                  </button>
                  {!speech.isSupported && (
                    <span className="text-xs text-neutral-500">HTTPS 환경에서만 음성 입력을 사용할 수 있어요.</span>
                  )}
                  {speech.error && <span className="text-xs text-red-500">{speech.error}</span>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">실시간 전사</p>
                  <p className="mt-2 text-sm text-neutral-600">
                    {speech.isRecording ? "듣는 중..." : liveTranscript ? "인식 완료" : "마이크를 켜면 자동으로 텍스트를 채웁니다."}
                  </p>
                  <p className="mt-2 text-sm font-medium text-neutral-900">
                    {liveTranscript || speech.lastTranscript || "아직 전사된 문장이 없습니다."}
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">세션 컨트롤</p>
                  <p className="mt-2 text-sm text-neutral-600">진행 중인 주문을 초기화하고 새 세션을 시작할 수 있습니다.</p>
                  <button
                    type="button"
                    onClick={handleNewSession}
                    className="mt-3 inline-flex items-center rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-400"
                  >
                    새 주문 시작
                  </button>
                </div>
              </div>
            </div>

            {draft ? (
              <OrderSummaryCard draft={draft} onConfirm={handleConfirm} isConfirming={isConfirming} />
            ) : (
              <aside className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow">
                ORDER_DRAFT가 생성되면 이 영역에서 옵션/금액/확정 버튼을 표시합니다.
              </aside>
            )}
          </div>
        </section>

        {isMenuOpen ? (
          <MenuModal
            menuItems={filteredMenu}
            search={menuQuery}
            onSearchChange={setMenuQuery}
            onClose={() => setIsMenuOpen(false)}
          />
        ) : null}
      </div>
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
                <article key={item.sku} className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="relative h-32 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={menuImages[item.sku] ?? `https://source.unsplash.com/400x300/?coffee&sig=${item.sku}`}
                      alt={item.display}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                      {item.sizes_enabled ? "사이즈 선택" : "단일 사이즈"}
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-lg font-semibold text-neutral-900">{item.display}</p>
                      <p className="text-xs text-neutral-400">{item.sku}</p>
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
                  </div>
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
