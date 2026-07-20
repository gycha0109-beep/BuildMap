# Change Card Mutation Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 목적

Change Card는 BuildMap의 핵심 원천 기록이다. 승인된 Change Card가 사후 자유롭게 수정되면 Decision Timeline의 신뢰가 깨진다.

## 2. 승인 전 수정 가능 범위

초안 또는 수정 중 상태에서는 Project Owner가 다음을 수정할 수 있다.

- `card_type` 또는 `type` 후보
- `title`
- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`
- 연결 후보
- 공개 상태 후보
- 민감도 후보

## 3. 승인 후 변경 금지 후보

- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`
- `linked_problem_definition_id`
- `linked_hypothesis_id`
- `linked_feedback_id`

## 4. 승인 후 변경 가능 후보

- `visibility_status`
- `sensitivity_status`
- `archived_at`
- `updated_at` 자동 갱신

단, 변경 가능 후보도 Project Owner만 가능해야 한다.

## 5. 새 Change Card 생성 유도

승인된 Change Card의 본문/근거/판단이 바뀌어야 한다면 기존 기록을 수정하지 않고 새 Change Card를 작성하도록 유도한다.

예:

- 기존 판단이 잘못되었다.
- 새로운 사용자 피드백으로 근거가 바뀌었다.
- 방향 전환이 발생했다.

이 경우 기존 Change Card 수정이 아니라 `판단 수정`, `가설 반박`, `방향 전환` 유형의 새 Change Card가 적합하다.

## 6. RLS / trigger / application validation 역할

| 경계 | 가능한 것 | 어려운 것 | 판단 |
|---|---|---|---|
| RLS | Owner만 update 허용 | 컬럼별 상태별 update 제한 | 단독으로 부족 |
| trigger | 승인 상태에서 특정 컬럼 변경 차단 | UX 예외 처리 복잡 | 강력 후보 |
| application validation | 사용자 안내/예외 UX | DB 우회 방지 약함 | trigger와 병행 후보 |

## 7. 1차 권장

- Project Owner update policy는 유지한다.
- 승인된 Change Card 핵심 내용 변경 제한 trigger 후보를 유지한다.
- UX에서는 승인 후 변경이 필요할 때 새 Change Card 생성을 안내한다.
- 공개 상태/민감도 변경은 Project Owner에게 허용 후보로 둔다.

## 8. 11단계 전 결정

1. trigger로 제한할 컬럼 최종 목록
2. 승인 상태의 정의: `work_status = 'approved'`
3. `approved_at`이 있는 경우와 없는 경우 처리
4. archived 처리와 mutation 제한의 관계
