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
          <p className="eyebrow">Decision context for builders</p>
          <h1>프로젝트가 왜 지금의 모습이 되었는지 기록합니다.</h1>
          <p>
            문제, 가설, 거친 메모와 판단을 연결해 변화의 맥락을 남깁니다.
            BuildMap은 결과보다 그 결과에 도달한 이유를 보존하는 Builder 기록 플랫폼입니다.
          </p>

          <div className="flow-line" aria-label="BuildMap workflow">
            <span className="flow-node">Problem</span>
            <span>→</span>
            <span className="flow-node">Hypothesis</span>
            <span>→</span>
            <span className="flow-node">Rough Note</span>
            <span>→</span>
            <span className="flow-node">Review</span>
            <span>→</span>
            <span className="flow-node">Decision</span>
          </div>

          <Link className="button" href="/login">
            BuildMap 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
