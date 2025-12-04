export default function KioskPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-2xl font-semibold">대화 로그</h2>
        <div className="mt-4 h-80 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
          LLM 파이프라인 구현 후 여기에 대화가 표시됩니다.
        </div>
        <form className="mt-6 flex gap-3">
          <input
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
            placeholder="음료를 말씀해 주세요"
          />
          <button
            type="button"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
          >
            보내기
          </button>
        </form>
        <button
          type="button"
          className="mt-3 text-sm text-neutral-500 underline decoration-dotted"
        >
          새 주문 시작
        </button>
      </section>
      <aside className="rounded-2xl bg-white p-6 shadow">
        <h3 className="text-lg font-semibold">주문 요약</h3>
        <p className="mt-3 text-sm text-neutral-500">ORDER_DRAFT가 생성되면 여기에서 옵션을 확인합니다.</p>
      </aside>
    </div>
  );
}
