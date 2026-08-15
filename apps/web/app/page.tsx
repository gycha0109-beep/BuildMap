import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell stack">
      <section className="panel stack">
        <p className="muted">BuildMap MVP</p>
        <h1>프로젝트가 왜 지금의 모습이 되었는지 기록합니다.</h1>
        <p>
          문제, 가설, 메모, 변화 카드를 연결해 Decision Timeline으로 남기는
          Builder 중심의 기록 도구입니다.
        </p>
        <div>
          <Link className="button" href="/login">
            시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
