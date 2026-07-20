# Local Dry-run Preparation Plan

## 주의

이 문서는 계획이다. 실제 명령을 실행하지 않는다.

## Local dry-run의 목적

- SQL draft 문법 확인
- RLS policy 동작 확인
- public-safe view 동작 확인
- secure RPC token 검증 확인
- helper/trigger 동작 확인
- 7.5 Test Case 기반 수동 검증 준비

## Dry-run 전 준비물

- 별도 실험용 branch
- local-only Supabase 환경
- 원격 Supabase와 분리된 상태
- 실패 로그 저장 위치
- 7.5 Test Case 체크리스트
- 11단계 SQL draft 파일 순서 확인

## Dry-run 검증 순서 후보

1. ZIP 구조 확인
2. git status 확인
3. 정식 `supabase/migrations`와 draft 경로 구분 확인
4. 실험용 branch 생성 후보
5. draft 파일을 임시 migration path로 복사하는 후보
6. local Supabase start 후보
7. local db reset 후보
8. `supabase db lint` 후보
9. SQL smoke test 후보
10. 7.5 Test Case 기반 수동 검증 후보
11. 실패 로그 수집 후보
12. 보정 후 재시도 후보

## 실행 전 백업/격리 원칙

- remote DB에 연결하지 않는다.
- production/staging/local 기존 DB에 직접 적용하지 않는다.
- dry-run 전 현재 작업 상태를 commit 또는 별도 백업한다.
- draft SQL은 정식 파일로 승격하지 않는다.

## 실패 시 원칙

- 실패 로그를 저장한다.
- SQL draft에 직접 대규모 수정하지 않고 correction 문서를 먼저 작성한다.
- 실패한 파일과 Test Case ID를 연결한다.
- 보정 후 재시도 여부를 사용자가 결정한다.

## Remote Supabase 적용 금지

13단계에서도 기본은 local-only dry-run 후보이다. remote Supabase project 적용은 별도 단계에서만 검토한다.
