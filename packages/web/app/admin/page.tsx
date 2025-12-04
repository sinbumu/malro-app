const dummyOrders = [
  { id: 'TEMP-001', summary: '아이스 아메리카노 2잔', status: 'PREPARING' },
  { id: 'TEMP-002', summary: '바닐라라떼 1잔', status: 'READY' }
];

export default function AdminPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">주문 현황</h1>
          <p className="text-sm text-neutral-500">Prisma + SQLite 연동 시 실제 데이터로 대체됩니다.</p>
        </div>
        <button className="rounded-lg border px-4 py-2 text-sm">새로고침</button>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">요약</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {dummyOrders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{order.id}</td>
                <td className="px-4 py-3">{order.summary}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
