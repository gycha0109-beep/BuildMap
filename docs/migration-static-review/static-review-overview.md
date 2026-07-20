# 12단계 정적 검수 개요

## 12단계의 목적

12단계는 11단계 SQL draft를 실제 local dry-run에 넣기 전, 실행 없이 위험을 식별하고 dry-run 설계를 고정하는 단계다.

## 11단계에서 유지할 결론

- `supabase/migrations_draft`는 정식 migration 경로가 아니다.
- `share_token` 원문 저장은 금지한다.
- `share_token_hash`는 `digest(token, 'sha256')` 후보를 유지한다.
- 링크 공개는 secure RPC 후보를 우선한다.
- 전체 공개 데이터는 public-safe view 후보를 우선한다.
- `feedbacks.project_id`는 1차 draft에서 저장하지 않는다.
- Project Owner 중심 권한 모델을 유지한다.
- 관리자/팀/조직/비로그인 쓰기 권한은 제외한다.

## 11단계에서 남은 위험

| 위험 | 성격 | 12단계 처리 |
|---|---|---|
| public-safe view가 source table grant/RLS와 충돌할 가능성 | 보안/동작 | dry-run 핵심 실험 |
| helper function의 기본 `PUBLIC EXECUTE` 노출 | 보안 | revoke/grant 패턴 검토 |
| `SECURITY DEFINER` RPC의 권한 상승 | 보안 | `search_path`, 반환 컬럼, grant 제한 검토 |
| `feedback_requests.change_card_id`와 `project_id` 불일치 | 무결성 | trigger/app validation 후보 정리 |
| approved Change Card의 승인 필드 사후 조작 | 무결성 | trigger 후보 보강 |
| 7.5 테스트 매핑 누락 | 검증 | dry-run 전 보강 |

## 정적 검수 대상

- `supabase/migrations_draft/*.sql`
- 7.5 Test Case ID
- 8단계 RLS Policy ID
- 10단계 blocker와 corrections
- 11단계 SQL file map

## dry-run 준비 대상

- SQL 파일 순서
- local-only 환경 격리
- 임시 migration path 복사 후보
- lint / reset / advisor 후보
- 실패 로그 수집 방식
- 수동 검증 시나리오

## 13단계로 넘어가기 전 필요한 보정

1. `feedback_requests.change_card_id` 정합성 검증 후보를 SQL draft 또는 dry-run TODO에 명확히 남긴다.
2. approved Change Card에서 `approved_at`, `approved_by_builder_profile_id`, `work_status` 변경 제한을 trigger 후보에 추가한다.
3. function `EXECUTE` 권한 revoke/grant 패턴을 dry-run 검증 항목으로 명시한다.
4. public-safe view가 실패할 경우 RPC/API 전환 루트를 명시한다.
5. 7.5 Test Case ID 매핑 누락 항목을 별도 보강 대상으로 둔다.

## Go / Conditional Go / No-Go 기준

### Go

- dry-run을 실행해도 되는 수준으로 위험이 정리됨
- 예상 실패와 보정 루트가 문서화됨
- SQL 파일은 계속 draft 경로에 있음

### Conditional Go

- dry-run 실행은 가능하나 일부 실패 가능성이 높음
- 실패 항목과 보정 루트가 명확함
- remote DB 적용 금지 원칙이 유지됨

### No-Go

- public-safe view 권한 모델이 불명확함
- RPC `search_path` / grant 모델이 불명확함
- helper function PUBLIC EXECUTE 위험이 방치됨
- Feedback author spoofing 방지가 불명확함
- approved Change Card 승인 필드 조작 위험이 방치됨
- SQL draft가 실제 적용 파일처럼 보임

## 현재 판정

**Conditional Go**다. 13단계에서 local dry-run을 진행할 수는 있지만, dry-run 전 SQL patch 또는 TODO 보강 단계가 선행되는 편이 안전하다.
