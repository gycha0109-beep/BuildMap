# Migration Draft Corrections

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 목적

이 문서는 9단계 migration draft를 실제 migration 파일로 옮기기 전에 반영해야 할 보정 목록이다.

심각도:

- blocker
- high
- medium
- low

## 2. 보정 목록

| Correction ID | 관련 9단계 문서 | 문제 | 보정 방향 | 심각도 | 11단계 전 필수 | 관련 테스트 |
|---|---|---|---|---|---|---|
| COR-001 | `public-safe-view-migration-draft.md` | view의 RLS/security_invoker 동작 미검증 | 공식 문서와 dry-run으로 검증 | high | 예 | `PP-*`, `CC-*` |
| COR-002 | `link-sharing-rpc-migration-draft.md` | secure RPC `SECURITY DEFINER`/`search_path` 미확정 | `search_path` 고정, grant 제한 결정 | blocker | 예 | `LINK-*` |
| COR-003 | `share-token-hash-review` 대상 | `share_token_hash` 알고리즘 미확정 | `digest`/`hmac`/API hash 비교 후 1차 선택 | blocker | 예 | `LINK-*` |
| COR-004 | `feedback-schema-migration-draft.md` | Feedback author spoofing 방지 조건 구체화 필요 | `author_user_profile_id = current_user_profile_id()` 강제 | blocker | 예 | `FB-007`, `FB-019` |
| COR-005 | `change-card-schema-migration-draft.md` | approved Change Card 수정 제한 미확정 | trigger 또는 app validation 결정 | high | 예 | `OWN-*`, `CC-*` |
| COR-006 | `feedback-schema-migration-draft.md` | `feedbacks.project_id` 중복 저장 여부 미결정 | 저장하지 않거나 일치 trigger 필요 | high | 예 | `FB-*` |
| COR-007 | `project-schema-migration-draft.md` | `last_activity_at` 저장/파생 미결정 | 저장 후보면 갱신 이벤트 제한 | medium | 아니오 | 탐색 후순위 |
| COR-008 | `manual-verification-plan.md` | Test Case ID 매핑이 대표 수준 | 전체 ID별 매핑표 보강 | medium | 예 | 전체 |
| COR-009 | `rls-policy-migration-draft.md` | anon 원천 table select 위험 | 원천 table anon select 최소화 재확인 | high | 예 | `PP-*` |
| COR-010 | `public-safe-view-migration-draft.md` | public Feedback view 컬럼 제한 필요 | 내부 id/email/auth id 제외 확정 | blocker | 예 | `FB-015~017` |
| COR-011 | `change-card-schema-migration-draft.md` | `type` 필드명 가독성/충돌 위험 | `card_type` 후보 검토 | low | 아니오 | 없음 |
| COR-012 | `project-schema-migration-draft.md` | `share_token_hash unique` null 처리 | partial unique index 후보 검토 | medium | 예 | `LINK-*` |
| COR-013 | `trigger-and-constraint-migration-draft.md` | feedback_request target 제약 불명확 | project 또는 change_card target 관계 정리 | medium | 예 | `FB-*` |
| COR-014 | `official-docs-verification-notes.md` | 공식 문서 재검증 전제 | Supabase/PostgreSQL 공식 문서 확인 | high | 예 | 전체 |

## 3. blocker 항목

실제 migration 파일 작성 전 반드시 처리해야 할 blocker는 다음이다.

- COR-002: secure RPC security definer / search_path / grant
- COR-003: `share_token_hash` 알고리즘
- COR-004: Feedback author spoofing 방지
- COR-010: public Feedback view 컬럼 제한

## 4. high 항목

- public-safe view 보안 검증
- approved Change Card mutation boundary
- `feedbacks.project_id` 중복 저장 여부
- anon 원천 table select 최소화
- 공식 문서 재검증

## 5. 결론

11단계는 진행 가능하지만, 위 blocker는 11단계 초반에 먼저 보정해야 한다.
