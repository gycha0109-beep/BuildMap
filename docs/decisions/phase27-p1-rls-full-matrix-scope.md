# Phase27 P1 RLS Full Matrix Scope

## 확정 범위

Phase27은 기존 migration/RLS/RPC를 바로 재설계하는 단계가 아니라, P0와 Link Sharing 바깥의 접근·변경·무결성 경계를 local-only 실행 가능한 P1 matrix로 고정하는 단계다.

검증 영역:

- Problem Definition / Hypothesis read·insert·update·archive boundary
- Feedback Request public/source/linked Change Card boundary
- public-selected Feedback의 request/card 상태 결합 경계
- Project Links owner/public/archive boundary
- Change Card create/approve/publish/post-approval mutation boundary
- User Profile / Builder Profile self/public/private boundary
- discovery public-safe view allowlist
- creator/author/approver spoofing negative controls
- Project ownership transfer 및 share-token hash 직접 변경 negative controls
- object grant, helper/trigger execute, delete-policy absence

## 보호 기준

- Phase25 Link Sharing `USER_LOCAL_PASS` 기록은 과거 실행 증거로 유지한다.
- Phase25 보호 파일 18개와 migration draft는 Phase27에서 수정하지 않는다.
- Phase26 baseline은 자동 갱신하지 않는다.
- Phase27은 별도 fixture ID namespace와 별도 runner/log를 사용한다.
- 실제 Supabase/Docker/psql 실행은 사용자 로컬 PC에서만 수행한다.

## 의도적으로 포함한 강한 negative controls

Phase27 독립 리뷰에서 기존 문서·SQL만으로 보장이 불명확한 경계를 테스트에 추가했다.

- archived Problem/Hypothesis 외부 read
- linked sensitive/draft Change Card의 Feedback Request source read
- selected Feedback의 linked-card 공개 조건
- creator/author/approver identity spoofing
- 승인 후 title/card_type/project/author/importance mutation
- 승인자와 승인시각의 최초 승인 integrity
- self-service account_status 변경
- 직접 Project ownership transfer
- lifecycle RPC를 우회한 share_token_hash 직접 변경

이 항목은 현재 구현이 반드시 통과한다고 선판정하지 않는다. 첫 local run이 blocker를 식별하면 기존 PASS를 억지로 유지하지 않고 최소 policy/trigger patch 단계로 이어간다.

## 변경하지 않음

- hosted Supabase
- production/staging DB
- formal migration promotion
- Phase25 link RPC response contract
- link token lifecycle RPC
- public-safe view execution model
- P0 scenario IDs

## 완료 기준

- 9개 SQL 파일과 167개 expected scenario가 manifest와 정확히 일치
- wrapper가 missing/duplicate/conflicting scenario를 검출
- remote-capable command가 없음
- static review 보완 반영
- 사용자 local run에서 최종 `OverallResult: PASS` 또는 blocker log 확보
