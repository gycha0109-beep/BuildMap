# Patch Overview

## 왜 dry-run 전에 patch가 필요한가

12단계 정적 검수에서 실패 가능성이 높은 항목이 이미 드러났다. 이를 그대로 local dry-run에 넣으면 실패 로그가 많아지고 원인 분리가 어려워진다.

따라서 13단계에서는 실제 실행 전에 SQL draft의 위험한 빈칸을 줄이고, dry-run에서 무엇을 검증해야 하는지 더 명확히 했다.

## 12단계에서 확인한 주요 위험

| 위험 | 영향 | 13단계 대응 |
|---|---|---|
| function `PUBLIC EXECUTE` 기본 노출 | helper/RPC 직접 호출 위험 | function-specific revoke/grant 후보 추가 |
| secure RPC template 미흡 | token 검증/반환 컬럼/권한 위험 | `SECURITY DEFINER`, `search_path`, public-safe jsonb 주석 보강 |
| public-safe view 동작 불확실 | source table grant/RLS 충돌 | view 유지 범위와 RPC/API 전환 기준 문서화 |
| Feedback Request target 불일치 | 다른 Project의 Change Card에 피드백 요청 연결 가능 | consistency trigger 후보 추가 |
| approved Change Card 승인 필드 조작 | 공식 기록 무결성 훼손 | `approved_at`, `approved_by_builder_profile_id`, `work_status` 제한 후보 추가 |
| Test Case mapping gap | dry-run 검증 누락 | token/view/feedback/change-card 중심 매핑 보강 |

## 13단계에서 보정한 항목

- 04 helpers/triggers: Feedback Request target consistency, approved Change Card mutation boundary 확장
- 05 RLS policies: `USING` / `WITH CHECK` 주석, Feedback insert 조건, link_shared RPC 분리 주석
- 06 public-safe views: view 유지 범위와 전환 기준 주석 강화
- 07 link sharing RPC: secure RPC template 주석 및 search_path 후보 보강
- 08 grants: function-specific revoke/grant 후보 보강
- 보조 문서: Test Case / Policy / SQL file mapping 보강

## 여전히 dry-run에서 검증해야 하는 항목

- `security_invoker` view와 source table grant/RLS 동작
- `SECURITY DEFINER` RPC의 실제 `search_path` / grant 동작
- function signature별 revoke/grant 문법
- trigger OLD/NEW 비교 문법
- `feedback_requests` target consistency trigger 동작
- approved Change Card mutation trigger 오탐/누락
- token 없음/잘못됨/revoked/rotation 시나리오

## 14단계로 넘어가기 전 상태 판단

판정: **Conditional Go**

SQL patch는 반영되었지만 실제 실행 검증은 아직 없다. 14단계에서 사용자가 직접 local dry-run을 실행하고 실패 로그를 가져오는 방식이 안전하다.

## Go / Conditional Go / No-Go 기준

- Go: patch 후 dry-run 예상 실패가 낮고, 실행 검증 항목이 명확한 상태
- Conditional Go: dry-run은 가능하지만 실패 가능성이 있는 실험 항목이 남은 상태
- No-Go: helper/RPC/view/Feedback/Change Card 무결성 위험이 방치된 상태

현재는 Conditional Go다.
