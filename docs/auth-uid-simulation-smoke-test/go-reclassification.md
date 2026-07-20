# 18단계 Go 재분류

## 기존 No-Go 사유

18단계 최초 문서의 `No-Go`는 Codex/ChatGPT 작업 환경에 다음 실행 도구가 없었기 때문이다.

- Supabase CLI
- Docker
- psql 또는 local DB session

즉, 기존 `No-Go`는 BuildMap SQL/RLS 설계 실패가 아니라 실행 환경 부재에 따른 보수적 판정이었다.

## 사용자 로컬 PASS 반영

사용자가 로컬 PC에서 직접 `auth.uid()` actor simulation smoke test를 실행했고 다음이 확인되었다.

- `anon` actor는 `auth.uid() = null`
- Method A `request.jwt.claim.sub`는 전체 authenticated actor에서 PASS
- Method B `request.jwt.claims` JSON은 전체 authenticated actor에서 PASS
- remote 적용 없음
- secret 노출 없음

## 재분류 결과

| 항목 | 기존 판정 | 사용자 로컬 결과 반영 후 |
|---|---:|---:|
| 18단계 진행 상태 | No-Go | Go |
| 기본 actor simulation method | 미정 | Method A |
| fallback method | 미정 | Method B |
| 19단계 진입 | 불가 | 가능 |

## 19단계 진행 방향

19단계는 전체 RLS 테스트 실행이 아니라, 20단계에서 사용자가 local-only로 실행할 P0 RLS Test Data Seed & Execution Script Pack 작성 단계로 진행한다.
