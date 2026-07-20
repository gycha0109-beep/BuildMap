# Trigger / Constraint Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 대상

- `set_updated_at` trigger
- approved Change Card content mutation 제한 trigger
- 상태값 check constraint
- `public_slug` unique constraint
- `share_token_hash` nullable unique 후보
- Feedback author spoofing 방지 후보
- feedback_request target constraint 후보
- foreign key cascade / restrict 정책 후보
- `archived_at` soft delete 후보

## 2. trigger / constraint 검수표

| 항목 | 목적 | 문법 검증 | 보안 검증 | 무결성 효과 | UX 영향 | 보정 제안 |
|---|---|---|---|---|---|---|
| `set_updated_at` | 수정 시점 자동 갱신 | 필요 | 낮음 | 높음 | 낮음 | 공통 trigger 후보 유지 |
| approved card mutation 제한 | 원천 기록 보호 | 필요 | 높음 | 높음 | 중간 | trigger 또는 app validation 결정 필요 |
| 상태값 check | 오타 방지 | 양호 후보 | 낮음 | 중간 | 낮음 | enum 대신 text+check 유지 |
| `public_slug unique` | 공개 경로 중복 방지 | 양호 후보 | 중간 | 높음 | 낮음 | slug 생성 정책 필요 |
| `share_token_hash unique` | token hash 중복 방지 | 확인 필요 | 높음 | 중간 | 낮음 | partial unique index 후보 검토 |
| Feedback author spoofing | 작성자 위조 방지 | 정책/helper 필요 | 높음 | 높음 | 낮음 | `WITH CHECK` + helper 후보 |
| feedback_request target constraint | Project/Change Card 대상 정합성 | 필요 | 중간 | 높음 | 낮음 | 둘 중 하나만 target 후보 |
| FK cascade/restrict | 삭제/보관 정합성 | 필요 | 중간 | 높음 | 중간 | soft delete 우선 검토 |
| `archived_at` | 보관 처리 | 양호 후보 | 중간 | 중간 | 낮음 | 공개 query에서 제외 조건 필요 |

## 3. 승인된 Change Card 수정 제한

### 변경 금지 후보

- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`
- `linked_problem_definition_id`
- `linked_hypothesis_id`
- `linked_feedback_id`

### 변경 가능 후보

- `visibility_status`
- `sensitivity_status`
- `archived_at`
- `updated_at` 자동 갱신

단, 변경 가능 후보도 Project Owner만 가능해야 한다.

## 4. `share_token_hash` unique 검토

`share_token_hash`가 nullable이면 일반 unique constraint는 여러 null을 허용할 수 있다. 이 동작은 일반적으로 괜찮지만, 실제 의도를 명확히 하기 위해 다음 후보를 비교한다.

- 일반 unique constraint
- `where share_token_hash is not null` partial unique index

1차 권장: partial unique index 후보 검토.

## 5. feedback_request target constraint

1차 Feedback Request 대상은 Project 또는 Change Card다.

검토 후보:

- `project_id`는 필수로 두고, `change_card_id`는 optional
- `change_card_id`가 있을 경우 해당 Change Card의 project와 feedback_request.project_id가 일치해야 함

실제 구현은 trigger 또는 FK/check 조합 검토 필요.

## 6. 결론

- approved Change Card mutation 제한은 high priority.
- Feedback author spoofing 방지는 blocker.
- `share_token_hash` unique 방식은 11단계 전 결정 필요.
- 상태값은 text+check 유지가 적절하다.
