import Link from "next/link";
import { AuthForm } from "./auth-form";

const errorMessages: Record<string, string> = {
  "missing-fields": "이메일과 비밀번호를 모두 입력해 주세요.",
  "invalid-credentials": "로그인 정보를 확인해 주세요.",
  "email-not-confirmed": "이메일 인증이 필요합니다. 받은 확인 메일에서 인증을 완료해 주세요.",
  "email-rate-limit": "Supabase 기본 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
  "profile-bootstrap": "Builder 프로필을 준비하지 못했습니다. 다시 시도해 주세요.",
  "password-length": "비밀번호는 8자 이상이어야 합니다.",
  "signup-failed": "회원가입을 완료하지 못했습니다.",
  "confirmation-failed": "이메일 확인 링크가 유효하지 않거나 만료되었습니다.",
};

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

  return (
    <main className="shell stack">
      <div className="row">
        <Link href="/">← BuildMap</Link>
      </div>

      <section className="panel stack">
        <div>
          <p className="muted">Builder account</p>
          <h1>로그인 또는 회원가입</h1>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p>{message}</p> : null}

        <AuthForm />
      </section>
    </main>
  );
}
