# 11단계 이후 남는 항목

## 실제 Supabase 문법 실행 검증

- `CREATE POLICY` syntax
- `CREATE VIEW ... with (security_invoker = true)` 지원 여부
- `SECURITY DEFINER` function behavior
- trigger syntax
- grants and PostgREST exposure

## share_token

- token 길이와 난수성 확정
- `digest` vs `hmac` 최종 결정
- token hash type: `text` vs `bytea`
- token 원문 로그 노출 방지
- 실패 응답 통일

## public_slug

- 실제 생성 정책
- 중복 처리
- 변경 가능 여부

## last_activity_at

- 저장 여부
- 갱신 trigger 여부
- 앱 갱신 방식

## Feedback

- 작성자 동의 UX
- 공개 작성자 표시 정책 구체화
- 작성자 수정 허용 여부

## 구현 단계

- API route
- 프론트엔드
- 자동화 테스트 코드
- Supabase CLI 적용
- local dry-run
