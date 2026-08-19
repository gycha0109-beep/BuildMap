import Link from "next/link";
import { AuthForm } from "./auth-form";

const errorMessages: Record<string, string> = {
  "missing-fields": "이메일과 비밀번호를 모두 입력해 주세요.",
  "invalid-credentials": "로그인 정보를 확인해 주세요.",
  "email-not-confirmed": "이메일 인증이 필요합니다. 받은 확인 메일에서 인증을 완료해 주세요.",
  "email-rate-limit": "Supabase 기본 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
  "profile-bootstrap": "계정 프로필을 준비하지 못했습니다. 다시 시도해 주세요.",
  "password-length": "비밀번호는 8자 이상이어야 합니다.",
  "signup-failed": "회원가입을 완료하지 못했습니다.",
  "confirmation-failed": "이메일 확인 링크가 유효하지 않거나 만료되었습니다.",
};

function safeNextPath(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/p/") || value.startsWith("//")) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? errorMessages[params.error] : null;
  const message =
    params.message === "check-email"
      ? "확인 이메일을 보냈습니다. 이메일 인증 후 다시 접속해 주세요."
      : null;
  const next = safeNextPath(params.next);
  const scoutFlow = Boolean(next);

  return (
    <main className="public-shell">
      <section className="public-card narrow">
        <Link className="public-brand" href="/">
          <span className="brand-mark">BM</span>
          BuildMap
        </Link>

        <div className="auth-title">
          <p className="eyebrow">{scoutFlow ? "Scout account" : "Builder account"}</p>
          <h1>{scoutFlow ? "피드백을 남기기 위해 로그인" : "다시 판단 흐름으로 돌아가기"}</h1>
          <p>
            {scoutFlow
              ? "External Feedback은 로그인 사용자만 작성할 수 있으며 제출 내용은 먼저 Builder 내부 검토로 들어갑니다."
              : "로그인하거나 새 Builder 계정을 만드세요."}
          </p>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <div style={{ marginTop: error || message ? 18 : 0 }}>
          <AuthForm next={next} />
        </div>
      </section>
    </main>
  );
}
