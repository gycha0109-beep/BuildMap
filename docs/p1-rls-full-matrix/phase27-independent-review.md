# Phase27 Independent Review

## 리뷰 방법

구현 직후 테스트 팩을 요구사항 기준으로 다시 분리해 검토했다.

- 정책 문서 ↔ migration RLS ↔ public-safe view predicate 비교
- owner/non-owner/anon actor coverage 비교
- active/private/public/link_shared/archived 상태 조합 확인
- creator/author/approver identity 필드 negative control 확인
- 승인 전환과 승인 후 immutable field 구분
- source RLS와 public-safe view의 linked-card predicate parity 확인
- wrapper scenario oracle와 false-positive 경계 확인

## 최초 구현 후 발견한 누락

1. Seed가 RLS에서 만들 수 없는 adversarial Feedback row를 authenticated role로 삽입하려던 문제
2. Scout author fixture count가 1로 잘못 고정된 문제
3. archived Project의 link를 owner count에 포함한 잘못된 기대값
4. authenticated source RLS의 linked sensitive/draft Feedback Request 검증 누락
5. public-selected Feedback의 linked-card 공개 조건 검증 누락
6. creator/author/approver spoofing 검증 누락
7. 승인 후 title/card_type/project/author/importance 변경 검증 누락
8. self-service `account_status`와 direct ownership/token mutation 검증 누락

## 보완

- adversarial Feedback fixture는 local postgres role + Scout JWT claim context로 생성
- seed count와 owner-link count 수정
- scenario를 142개에서 167개로 확장
- 위 누락을 `P1-FR-019..028`, `P1-CC-021..028`, `P1-PROFILE-017..018`, `P1-INTEGRITY-017..018`, creator spoof scenarios로 추가
- external JSON manifest와 SQL source ID를 wrapper 실행 전 교차검증
- empty collection parameter 허용 및 `${FileName}:` 형태로 PowerShell parser 위험 제거

## 리뷰 판정

```text
PHASE27_REVIEW_RESULT: STATIC_PASS / LOCAL_RUNTIME_PENDING
```

현재 환경에는 Docker/Supabase/psql/PowerShell runtime이 없어 실제 정책 결과는 선판정하지 않는다. 특히 강한 negative control은 기존 구현 gap을 발견하기 위한 것이므로 첫 실행에서 FAIL이 나오면 테스트 결함으로 간주하지 않고 해당 row predicate/trigger를 우선 검토한다.
## Final review correction

- `P1-PROFILE-018`의 대상이 이미 Builder Profile과 1:1로 연결된 User Profile이면 unique constraint가 RLS보다 먼저 실패해 oracle이 흐려질 수 있었다.
- 별도 auth/user profile(`...0305` / `...1305`)을 fixture에 추가하되 Builder Profile은 만들지 않았다.
- identity reassignment negative control은 이 unbound foreign profile을 대상으로 실행하여 RLS `WITH CHECK` 경계를 직접 검증한다.
## Scenario parser false-positive correction

- 최초 wrapper의 scenario 정규식 `P1(?:-[A-Z0-9_]+)+`는 fixture label인 `P1-A-PUBLIC`, `P1-OWNER-A`, URL slug 조각까지 scenario ID로 오인할 수 있었다.
- 실제 계약 형식인 `P1-<DOMAIN>-NNN`만 인식하도록 `P1-[A-Z0-9_]+-\d{3}`로 제한했다.
- 이 보정은 manifest/source pre-run gate와 runtime NOTICE/table parser 양쪽에 동일하게 적용했다.
## Privilege oracle portability correction

- `has_table_privilege(..., 'INSERT,UPDATE')`의 복합 문자열 해석에 의존하지 않도록 INSERT와 UPDATE를 각각 호출해 `and`로 결합했다.
- `P1-INTEGRITY-001..005`가 PostgreSQL 버전별 privilege-text parsing 차이로 중단되는 위험을 제거했다.


## First runtime follow-up

The first user-local run correctly produced blocker signals. Phase27.1 implementation and second independent review are recorded in:

- `phase27-first-runtime-failure-intake.md`
- `phase27-1-access-integrity-hardening.md`
- `phase27-1-independent-review.md`
- `phase27-1-static-validation-report.md`
