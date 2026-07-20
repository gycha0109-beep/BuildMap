# 20단계 실행 순서

1. PowerShell wrapper 실행 전 BuildMap 루트 위치 확인
2. local DB container 탐색
3. `phase20_00_preflight.sql`
4. `phase20_01_seed_p0_fixture.sql`
5. `phase20_02_project_access_p0.sql`
6. `phase20_03_rough_note_ai_draft_p0.sql`
7. `phase20_04_change_card_public_boundary_p0.sql`
8. `phase20_05_feedback_author_spoofing_p0.sql`
9. `phase20_06_public_safe_view_p0.sql`
10. `phase20_07_approved_change_card_trigger_p0.sql`
11. `phase20_99_result_summary.sql`
12. 로그 저장
13. 사용자가 로그를 ChatGPT/Codex에 제공

## 중단 기준

- preflight 실패
- seed 실패
- remote 연결 의심
- secret 출력
- `UNEXPECTED_ALLOW`
- public-safe view에서 민감 컬럼 노출
- Feedback author spoofing 허용
- approved Change Card mutation 허용

## 20단계 재실행 시 보정된 순서

1. `phase20_00_preflight.sql` PASS 확인
2. `phase20_01_seed_p0_fixture.sql` 실행
3. seed 중 `SEED-FB-CTX-001 feedback_author auth.uid` 출력 확인
4. `SEED-005 feedbacks` count 확인
5. seed가 PASS한 경우에만 Project/Rough Note/Change Card/Feedback/View/Trigger P0 테스트를 계속 진행
6. seed가 실패하면 P0 본 테스트 결과로 해석하지 않고 `SEED_FAIL`로 중단

## PATCH 21 execution note

`phase20_00_preflight.sql`에서 privilege matrix를 먼저 확인한다. `GRANT_FAIL`, `ACCESS_PATH_MISMATCH`, `VIEW_ACCESS_ERROR`가 출력되면 broad grant를 추가하지 말고 해당 로그를 가져온다.

## Phase22 note

Phase22 이후 실행 순서: preflight의 `PRE-050`이 먼저 public-safe view actual SELECT를 검증한다. `VIEW_ACCESS_ERROR`나 `VIEW_BOUNDARY_FAIL`이 나오면 후속 P0 결과를 PASS로 판단하지 않는다.

## Phase22.5 execution-order correction

`phase20_06_public_safe_view_p0.sql`은 이제 `public_builder_profiles`를 먼저 독립 block으로 검증한 뒤, 나머지 public-safe view를 검증한다.

전체 public-safe view runtime 대상은 다음 8개다.

1. `public_builder_profiles`
2. `public_project_cards`
3. `public_project_pages`
4. `public_change_cards`
5. `public_decision_timeline`
6. `public_feedback_requests`
7. `public_feedbacks`
8. `public_project_links`

`public_builder_profiles`가 `VIEW_ACCESS_ERROR` 또는 `VIEW_BOUNDARY_FAIL`을 출력하면 네 번째 실행은 PASS로 판정하지 않는다.

## Phase23 이후 실행 순서 note

Phase23은 SQL 실행 순서를 바꾸지 않는다. 기존 Phase20 SQL 순서는 유지한다.

변경된 것은 wrapper final classification 방식이다. 각 SQL 파일 실행 직후 해당 파일의 output에서 exact signal을 파싱하고, final scan은 file별 parsed result object를 집계한다. `NEXT` 안내문과 search hint는 더 이상 failure source가 아니다.
