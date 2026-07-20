# Failure Classification Guide

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 실패 분류

| 분류 | 의미 | 대표 증상 | 사용자가 가져와야 할 로그 | 16단계 처리 방향 |
|---|---|---|---|---|
| ENV-FAIL | Supabase CLI / Docker / daemon 문제 | command not found, Docker daemon unavailable | version 명령 결과, stderr | 환경 보정 |
| INIT-FAIL | `supabase init` 또는 config 문제 | config 없음, init 실패 | init stderr, config 존재 여부 | config 보정 |
| MIGRATION-COPY-FAIL | SQL draft 복사 문제 | 파일 누락, 경로 오류 | 파일 목록 | 복사 절차 보정 |
| SCHEMA-FAIL | create table / FK / constraint 문제 | relation not found, FK 오류 | 실패 SQL 파일/에러 | SQL schema patch |
| EXTENSION-FAIL | pgcrypto 등 extension 문제 | extension 생성 실패, digest 없음 | extension 에러 | extension/hash patch |
| HELPER-FAIL | helper function 문제 | function does not exist, return type 오류 | 함수명/에러 | helper patch |
| TRIGGER-FAIL | trigger function 문제 | OLD/NEW 오류, trigger creation fail | trigger명/에러 | trigger patch |
| RLS-FAIL | policy USING / WITH CHECK 문제 | policy syntax 오류, helper 참조 오류 | policy명/에러 | RLS patch |
| VIEW-FAIL | security_invoker / grant / column 문제 | view creation fail, permission denied | view명/에러 | view/RPC 경계 보정 |
| RPC-FAIL | SECURITY DEFINER / search_path / jsonb / token 문제 | function create fail, permission error | RPC명/에러 | RPC patch |
| GRANT-FAIL | revoke/grant/function signature 문제 | function signature mismatch | grant SQL 주변 에러 | grant patch |
| LINT-WARN | db lint warning | lint warning | warning 목록 | lint patch 후보 |
| SECURITY-WARN | security advisor warning | RLS, grant, definer warning | warning 목록 | security patch |
| UNKNOWN-FAIL | 원인 미분류 | 위 분류 불가 | 첫 실패 명령 전체 요약 | 원인 분석 |

## 분류 우선순위

첫 번째 실패를 먼저 분류한다. 후속 실패는 첫 실패의 연쇄 결과일 수 있으므로, 첫 실패 파일과 에러 메시지를 우선 가져온다.

## 16단계 방향

- 환경 실패면 SQL patch를 하지 않는다.
- SQL 실패면 16단계 SQL Patch로 이동한다.
- lint/security warning이면 16단계 Security/Lint Patch로 이동한다.
- 모든 명령이 성공하면 Manual RLS Scenario Test Plan으로 이동한다.
