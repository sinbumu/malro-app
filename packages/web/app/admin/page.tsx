"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { AdminOrder, fetchOrders, updateOrderStatus } from "../../lib/apiMock";

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const summary = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => order.status === "PENDING").length;
    const preparing = orders.filter((order) => order.status === "PREPARING").length;
    const ready = orders.filter((order) => order.status === "READY").length;
    return [
      { label: "오늘 접수", value: total, helper: "최근 30분 기준" },
      { label: "대기 중", value: pending, helper: "확인 필요" },
      { label: "준비 중", value: preparing, helper: "바리스타 진행" },
      { label: "픽업 대기", value: ready, helper: "콜벨 안내 필요" }
    ];
  }, [orders]);
  const createdFormatter = useMemo(
    () => new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchOrders();
        if (mounted) {
          setOrders(data);
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    const timer = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  async function handleStatusChange(id: string, status: AdminOrder["status"]) {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));
    await updateOrderStatus(id, status);
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">malro operations</p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-900">실시간 주문 콘솔</h1>
            <p className="mt-1 text-sm text-neutral-500">
              `/order/recent`를 30초 간격으로 폴링하고 있으며, 곧 `/events` SSE로 전환됩니다.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 shadow-inner">
            ⚡ Live updates 준비 중
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.helper}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl bg-white shadow">
        {isLoading && <p className="px-4 py-2 text-xs text-neutral-400">주문 목록을 불러오는 중...</p>}
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t text-sm">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{order.id}</td>
                <td className="px-4 py-3 text-neutral-500">{createdFormatter.format(new Date(order.createdAt))}</td>
                <td className="px-4 py-3">
                  {order.items.map((item) => (
                    <div key={item.sku} className="text-xs text-neutral-600">
                      {item.label} × {item.qty} ({order.orderType})
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as AdminOrder["status"])}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="READY">READY</option>
                    <option value="DONE">DONE</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
