"use client";

import { OrderDraft } from "../lib/apiMock";

interface Props {
  draft: OrderDraft;
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
}

export function OrderSummaryCard({ draft, onConfirm, isConfirming }: Props) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">ORDER_DRAFT</p>
          <h3 className="text-xl font-semibold">주문 요약</h3>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {draft.orderType === "TAKE_OUT" ? "포장" : "매장"}
        </span>
      </header>

      <ul className="mt-4 space-y-3 text-sm">
        {draft.items.map((item, idx) => (
          <li key={idx} className="rounded-xl border border-neutral-200 px-4 py-3">
            <p className="font-semibold">{item.label}</p>
            <p className="text-neutral-500">
              수량 {item.qty} · {item.options}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={onConfirm}
        disabled={isConfirming}
        className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
      >
        {isConfirming ? "확정 중..." : "주문 확정"}
      </button>
      <p className="mt-2 text-xs text-neutral-400">※ 실제 API 연동 시 `/order/confirm` 호출 예정</p>
    </section>
  );
}

