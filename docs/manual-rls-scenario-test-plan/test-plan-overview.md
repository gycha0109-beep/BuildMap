# Manual RLS Scenario Test Plan Overview

## 테스트 목적

BuildMap SQL draft가 local schema application과 lint를 통과한 뒤, RLS behavior, public-safe view, secure RPC, function permission, trigger behavior를 actor별로 수동 검증하기 위한 계획을 정의한다.

## 테스트 전제

- 사용자의 로컬 PC에서 `supabase start`가 성공했다.
- `supabase db reset`이 성공했다.
- `supabase db lint --local`이 `No schema errors found`로 통과했다.
- remote Supabase 적용은 하지 않았다.
- `migrations_draft`는 여전히 `DRAFT ONLY` 상태다.

## 테스트 환경

- local Supabase stack
- Windows PowerShell 기준 실행 후보
- remote credential 미사용
- SQL Editor 미사용
- 테스트 데이터는 local DB에만 생성 후보

## local-only 원칙

Manual test도 local-only로 수행한다. remote DB, staging DB, production DB에는 연결하지 않는다.

## remote 금지 원칙

- `supabase link` 금지
- `supabase db push` 금지
- `supabase db pull` 금지
- Supabase SQL Editor 사용 금지
- remote credential 사용 금지

## 테스트 actor

- `anon`
- `authenticated_owner`
- `authenticated_non_owner`
- `feedback_author`
- `link_shared_authenticated_user`
- `project_owner_builder`
- `non_owner_builder`

## 테스트 데이터

- private/public/link_shared Project
- owner/non-owner profile 및 builder profile
- public_slug / share_token_hash 후보
- approved/draft/internal/sensitive Change Card
- rough note / AI structured draft
- public/internal Feedback Request
- owner/non-owner Feedback
- public selected Feedback

## 테스트 범위

- table RLS read/write boundary
- public-safe view access and column exposure
- secure RPC token handling
- function execute grant exposure
- trigger behavior

## 성공 기준

- expected allow는 허용된다.
- expected deny는 차단된다.
- public-safe view가 내부 컬럼을 노출하지 않는다.
- secure RPC가 token failure를 안전하게 처리한다.
- helper/trigger internal function이 과하게 execute 노출되지 않는다.
- 승인된 Change Card 핵심 mutation이 차단된다.

## 실패 기준

- `UNEXPECTED_ALLOW`
- private/internal row 외부 노출
- share_token_hash 또는 internal id/hash 노출
- author spoofing 성공
- 비로그인 write 허용
- public_slug를 token처럼 사용하는 접근 허용

## 중단 기준

- remote 연결 징후 발견
- test data가 원격에 생성될 위험
- secret 값 출력
- source table에 broad anon select가 열려 내부 row가 보이는 경우
- helper/RPC execute grant가 과도하게 열려 보안 경계를 우회하는 경우

## 17단계 실행 방식 후보

17단계는 이 계획을 바탕으로 Manual RLS Scenario Test Execution 또는 Manual RLS Test Runbook 작성 단계로 진행한다. 실행 결과는 `test-execution-log-template.md` 형식으로 기록한다.
