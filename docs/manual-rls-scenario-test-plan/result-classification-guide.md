# Result Classification Guide

| 분류 | 의미 | 심각도 | 다음 조치 | 18단계 patch 필요 여부 |
|---|---|---|---|---|
| PASS | 기대 허용/차단과 실제 결과가 일치 | none | 다음 테스트 진행 | 아니오 |
| EXPECTED_DENY | 차단되어야 하는 요청이 차단됨 | none | 정상 deny로 기록 | 아니오 |
| UNEXPECTED_ALLOW | 차단되어야 하는 요청이 허용됨 | blocker | 즉시 중단 후보, security patch | 예 |
| UNEXPECTED_DENY | 허용되어야 하는 요청이 차단됨 | high/medium | policy/helper/view 조건 검토 | 가능 |
| POLICY_SYNTAX_ERROR | RLS policy SQL 또는 expression 오류 | high | SQL patch | 예 |
| HELPER_ERROR | helper function 결과/권한 오류 | high | helper patch | 예 |
| VIEW_ACCESS_ERROR | public-safe view 접근/컬럼 오류 | high | view/RPC/API boundary patch | 예 |
| RPC_ERROR | secure RPC 실행/응답/권한 오류 | high | secure RPC patch | 예 |
| TRIGGER_ERROR | trigger가 오탐/누락/문법 오류 | high | trigger patch | 예 |
| GRANT_ERROR | function/table/view grant 과다 또는 부족 | blocker/high | grant patch | 예 |
| TEST_DATA_ERROR | 테스트 데이터 전제가 잘못됨 | medium | test data setup 보정 | 아니오/보류 |
| ENV_ERROR | local Supabase/Docker/CLI 환경 오류 | medium | 환경 보정 | 아니오 |
| NEEDS_REVIEW | 기대 결과 해석이 불명확 | medium | 정책 문서 재검토 | 보류 |

## 보안 우선 규칙

`UNEXPECTED_ALLOW`, raw token/hash 노출, private/internal data 노출, author spoofing 성공, 비로그인 write 허용은 remote 적용 전 blocker다.
