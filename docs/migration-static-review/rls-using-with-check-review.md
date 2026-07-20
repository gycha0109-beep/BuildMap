# RLS USING / WITH CHECK Review

## 목적

RLS 정책에서 `SELECT`는 `USING`, `INSERT`는 `WITH CHECK`, `UPDATE`는 기존 row 접근 조건과 변경 후 row 조건을 모두 고려해야 한다. 12단계는 11단계 draft의 RLS 조건이 안전하게 좁혀져 있는지 정적으로 검수한다.

## 테이블별 요약

| 테이블 | SELECT | INSERT | UPDATE | 공개 조건 |
|---|---|---|---|---|
| `user_profiles` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |
| `builder_profiles` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |
| `projects` | SELECT `USING` | INSERT `Builder WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: public만 view, link_shared는 RPC |
| `problem_definitions` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |
| `hypotheses` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |
| `rough_notes` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner + 상태 제한` | public read: 차단 |
| `ai_structured_drafts` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner + 상태 제한` | public read: 차단 |
| `change_cards` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner + trigger 제한` | public read: approved+published+normal |
| `feedback_requests` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |
| `feedbacks` | SELECT `USING` | INSERT `Feedback Request + author check` | UPDATE `Owner review/public select` | public read: public_selected만 public-safe view |
| `project_links` | SELECT `USING` | INSERT `Owner WITH CHECK` | UPDATE `Owner USING+WITH CHECK` | public read: Project 공개 조건 |

## 공통 검수 항목

- INSERT 정책에 `WITH CHECK`가 있는가.
- UPDATE 정책에 `USING`과 `WITH CHECK`가 모두 있는가.
- Project Owner update가 너무 넓지 않은가.
- Change Card approve/publish가 Owner에게만 제한되는가.
- Feedback insert가 Feedback Request 조건과 author 조건을 동시에 확인하는가.
- Rough Note / AI Draft가 외부 read 불가인지 확인했는가.
- public read가 원천 row 전체 노출로 이어지지 않도록 view/RPC 경계를 유지하는가.
- 관리자 권한이 섞이지 않았는가.

## 보정 제안

1. `change_cards_update_owner_draft`는 trigger와 결합하여 approved 핵심 컬럼 변경을 막는다.
2. `feedbacks_insert_public_request_draft`는 `can_insert_feedback()`과 trigger를 함께 검증한다.
3. link_shared read/write는 일반 RLS read가 아니라 secure RPC를 우선한다.
4. source table `anon select`는 public-safe view가 성공할 때까지 넓히지 않는다.

## Dry-run 검증 항목

- 비로그인 insert가 모든 테이블에서 실패하는지.
- Owner가 아닌 로그인 사용자의 update가 실패하는지.
- 공개 Project라도 internal Change Card가 source table에서 읽히지 않는지.
- view/RPC 경계가 실제로 기대대로 동작하는지.
