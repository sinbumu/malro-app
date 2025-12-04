export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">말로 주문 MVP</h1>
      <p className="text-lg text-neutral-700">
        키오스크 화면(/kiosk)과 어드민 화면(/admin)을 한 곳에서 개발하고 시연하기 위한 Next.js 기반 앱입니다.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-neutral-700">
        <li>자연어 입력 → ASK/ORDER_DRAFT 파이프라인을 실험합니다.</li>
        <li>LLM 응답을 검증하고 필요한 슬롯만 재질문하는 흐름을 구성합니다.</li>
        <li>SQLite에 저장된 주문을 어드민 화면에서 실시간으로 확인합니다.</li>
      </ul>
    </section>
  );
}
