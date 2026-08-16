"use client";

import { useRef, useState, type FormEvent } from "react";
import { signInAction, signUpAction } from "./actions";

type SubmitIntent = "signin" | "signup" | null;

export function AuthForm() {
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState<SubmitIntent>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent =
      submitter instanceof HTMLButtonElement && submitter.dataset.intent === "signup"
        ? "signup"
        : "signin";

    submittingRef.current = true;
    setSubmitting(intent);
  }

  const busy = submitting !== null;

  return (
    <form className="stack" onSubmit={handleSubmit} aria-busy={busy}>
      <label className="field">
        <span>이메일</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly={busy}
        />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          readOnly={busy}
        />
      </label>
      <div className="row">
        <button
          className="button"
          formAction={signInAction}
          data-intent="signin"
          disabled={busy}
        >
          {submitting === "signin" ? "로그인 중…" : "로그인"}
        </button>
        <button
          className="button secondary"
          formAction={signUpAction}
          data-intent="signup"
          disabled={busy}
        >
          {submitting === "signup" ? "회원가입 중…" : "회원가입"}
        </button>
      </div>
      {busy ? <p className="muted">요청을 처리하고 있습니다. 잠시 기다려 주세요.</p> : null}
    </form>
  );
}
