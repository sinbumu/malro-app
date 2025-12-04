"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "DONE";

interface AdminOrder {
  id: string;
  createdAt: string;
  summary: string;
  status: OrderStatus;
}

const INITIAL_ORDERS: AdminOrder[] = [
  { id: "ORD-001", createdAt: new Date().toISOString(), summary: "ICE Americano M x2 (TAKE_OUT)", status: "PREPARING" },
  { id: "ORD-002", createdAt: new Date().toISOString(), summary: "Vanilla Latte L x1 (DINE_IN)", status: "READY" },
  { id: "ORD-003", createdAt: new Date().toISOString(), summary: "Matcha Latte S x1 (TAKE_OUT)", status: "PENDING" }
];

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>(INITIAL_ORDERS);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) => [
        ...prev,
        {
          id: `ORD-${String(prev.length + 1).padStart(3, "0")}`,
          createdAt: new Date().toISOString(),
          summary: "Mock 신규 주문 (SSE 연결 예정)",
          status: "PENDING"
        }
      ]);
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">malro Admin – Orders</h1>
        <p className="mt-2 text-sm text-neutral-500">
          실시간 갱신은 추후 `/events` SSE를 구독하여 연결할 예정입니다. 지금은 45초마다 더미 주문이 추가됩니다.
        </p>
      </header>

      <div className="rounded-2xl bg-amber-50 px-6 py-4 text-sm text-amber-700">
        ⚡ Live updates placeholder: 추후 SSE 연결 시 이 배너가 사라지고 실주문이 스트리밍됩니다.
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t text-sm">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{order.id}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
                <td className="px-4 py-3">{order.summary}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
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
