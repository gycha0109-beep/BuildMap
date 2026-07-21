# Phase30–31 Controlled Deployment Runbook

## 현재 허용 범위

Phase30에서는 release bundle 생성과 검증까지만 허용합니다. hosted project 작업은 금지합니다.

## Phase30.5 선행 확인

다음 항목이 모두 명시적으로 확인되어야 합니다.

1. 대상 Supabase project reference와 환경 구분
2. 현재 migration history export
3. 예상 history와 unexpected version 비교
4. backup/PITR 또는 복구 가능성
5. maintenance window와 담당자
6. 적용 중지 조건
7. 적용 후 Phase20/25/27.1/28/29 catalog 재검증 계획
8. credential이 console/log/document에 기록되지 않는 실행 방식

## No-go 조건

- 대상 project identity 불명확
- unexpected migration version 존재
- backup/restore 조건 미확인
- migration history repair 필요
- release bundle hash 불일치
- protected gate drift
- remote command가 dry-run과 실제 적용을 구분하지 못함

## Phase31 경계

Phase31에서만 명시적 사용자 승인 후 controlled hosted migration execution을 수행합니다. 자동 실행, background execution, 무인 rollback은 허용하지 않습니다.
