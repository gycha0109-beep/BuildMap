# Phase30.5 Design Review

## 목적

Phase30 formal bundle과 실제 대상 Supabase project identity·migration history·object inventory·운영 준비 상태를 결속해 Phase31 진입 가능 여부를 판정합니다.

## 채택 설계

- 원격 probe는 `psql` read-only transaction만 사용
- credential은 전용 process environment variable에서만 읽음
- connection string을 명령 인자, 로그, evidence에 기록하지 않음
- Phase30 bundle head/hash/artifact를 다시 검증
- project ref는 host 또는 user identity와 교차 확인
- server/schema/extension/privilege를 읽기 전용 조회
- migration history와 `public` 사용자 객체가 모두 0인 대상만 허용
- 운영 확인 사항을 evidence에 결속
- evidence는 `.local-evidence` 아래에만 생성

## Fail-closed 결정

기존 대상의 부분 migration, 수동 object 생성, unrelated public object를 자동으로 호환 처리하지 않습니다.

```text
CompatibilityMode: EMPTY_TARGET_ONLY_V1
ExistingOrAmbiguousTarget: DEPLOYMENT_HOLD
```

## 설계 리뷰 판정

`PASS`

Phase31 migration 실행은 포함하지 않습니다.
