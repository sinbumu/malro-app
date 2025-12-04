"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";
import { AdminOrder, fetchOrders, updateOrderStatus } from "../../lib/apiMock";

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      <header className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">malro Admin – Orders</h1>
        <p className="mt-2 text-sm text-neutral-500">
          실시간 갱신은 추후 `/events` SSE를 구독하여 연결할 예정입니다. 현재는 30초 간격으로 `/order/recent` 폴링을 수행합니다.
        </p>
      </header>

      <div className="rounded-2xl bg-amber-50 px-6 py-4 text-sm text-amber-700">
        ⚡ Live updates placeholder: 추후 SSE 연결 시 이 배너가 사라지고 실주문이 스트리밍됩니다.
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
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
                <td className="px-4 py-3 text-neutral-500">{new Date(order.createdAt).toLocaleTimeString()}</td>
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
