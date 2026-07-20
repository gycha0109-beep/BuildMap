# Result Report Template

사용자가 dry-run 후 최종 보고를 가져올 때 사용하는 양식이다.

## 1. 실행 환경

- OS:
- 터미널:
- Supabase CLI:
- Docker:
- Docker daemon:
- Git branch:
- git status:

## 2. 실행 전 확인

- BuildMap 루트 확인:
- migrations_draft 확인:
- SQL draft 9개 확인:
- DRAFT ONLY 주석 확인:
- 원본 supabase/migrations 미사용 확인:
- remote credential 값 미출력 확인:

## 3. workspace 생성 결과

- disposable workspace 사용:
- workspace 경로:
- 원본 수정 없음:
- workspace 보관/삭제 상태:

## 4. migration copy 결과

- 복사 성공:
- 복사 파일 수:
- 누락:
- 정렬 순서:
- DRAFT 주석 유지:

## 5. supabase start 결과

- 실행:
- exit code:
- 성공/실패:
- 주요 메시지:

## 6. supabase db reset 결과

- 실행:
- exit code:
- 성공/실패:
- 성공한 파일:
- 실패한 파일:
- 실패 위치:
- 에러 요약:

## 7. supabase db lint 결과

- 실행:
- exit code:
- security warning:
- performance warning:
- RLS warning:
- function warning:
- view warning:

## 8. 실패 로그

- 첫 실패 명령:
- 첫 실패 파일:
- 실패 분류:
- 에러 요약:
- 원문 로그 첨부 여부:
- 마스킹 완료:

## 9. 성공한 migration 파일

```text
-
-
```

## 10. 실패한 migration 파일

```text
-
-
```

## 11. 보안 경고

```text
-
-
```

## 12. RLS 경고

```text
-
-
```

## 13. view/RPC/function/trigger 관련 경고

```text
-
-
```

## 14. remote 미적용 확인

- `supabase link` 미실행:
- `supabase db push` 미실행:
- `supabase db pull` 미실행:
- SQL Editor 미사용:
- remote DB 미접속:

## 15. 다음에 도와줘야 할 것

```text
-
-
```
