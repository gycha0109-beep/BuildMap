import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-shell">
      <section className="public-card">
        <Link className="public-brand" href="/">
          <span className="brand-mark">BM</span>
          BuildMap
        </Link>

        <div className="public-hero">
          <p className="eyebrow">Builder&apos;s Decision Journal</p>
          <h1>중요한 판단만 남기세요. 나머지는 그냥 만들면 됩니다.</h1>
          <p>
            정리된 문서를 먼저 쓰지 않아도 됩니다. 프로젝트에서 있었던 일을 편하게 남기면
            BuildMap이 의미 있는 판단 후보만 골라 구조화하고, Builder가 공식 Decision으로
            확정합니다.
          </p>

          <div className="flow-line" aria-label="BuildMap workflow">
            <span className="flow-node">Capture</span>
            <span>→</span>
            <span className="flow-node">AI Review</span>
            <span>→</span>
            <span className="flow-node">Decision</span>
            <span>→</span>
            <span className="flow-node">Project History</span>
          </div>

          <p>
            프로젝트가 왜 지금의 모습이 되었는지, 몇 달 뒤에도 다시 이해할 수 있게 만드는
            초경량 Decision Journal입니다.
          </p>

          <Link className="button" href="/login">
            첫 Capture 남기기
          </Link>
        </div>
      </section>
    </main>
  );
}
