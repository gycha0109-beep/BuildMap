# Migration Readiness Security Gate

## 1. 목적

이 문서는 9단계 Supabase migration draft로 넘어가기 전 보안 게이트다. 실제 migration 작성 전에 통과/부분 통과/차단/추가 검토 필요/후순위 제외 상태를 확인한다.

## 2. 상태 값

| 상태 | 의미 |
|---|---|
| 통과 | migration draft로 옮겨도 되는 수준으로 결정됨 |
| 부분 통과 | 방향은 정했지만 세부 구현 결정을 더 해야 함 |
| 차단 | 결정 전 migration draft로 넘어가면 위험함 |
| 추가 검토 필요 | 9단계 초입에서 반드시 검토해야 함 |
| 후순위 제외 | 1차 migration에서 제외함 |

## 3. Security Gate 체크리스트

| 항목 | 상태 | 비고 |
|---|---|---|
| share_token 원문 저장 금지 원칙을 정했는가 | 통과 | 원문 저장 금지 방향 우선 |
| share_token hash 저장 후보를 검토했는가 | 부분 통과 | hash 방식 세부는 9단계 전 결정 |
| token 검증 위치를 RLS helper / secure RPC / API 중 어디로 둘지 결정했는가 | 추가 검토 필요 | secure RPC/API 우선 검토, 최종 미확정 |
| public_slug를 보안 토큰으로 사용하지 않는다고 확정했는가 | 통과 | public_slug는 경로 후보 |
| 공개 읽기에서 원천 테이블 row 전체 노출을 피하는 방향을 정했는가 | 통과 | public-safe boundary 필요 |
| public-safe view / RPC / API 경계 중 1차 방향을 정했는가 | 부분 통과 | 전체 공개는 view/API, 링크 공개는 RPC/API 후보 |
| 공개 Feedback에서 author_user_profile_id를 노출하지 않는다고 정했는가 | 통과 | 내부 식별자 노출 금지 |
| Feedback insert에서 작성자 위조 방지 조건을 정했는가 | 부분 통과 | 현재 auth user 기반 검증 필요 |
| Feedback 작성 조건에 Project 접근 조건을 포함했는가 | 통과 | 전체 공개/링크 공개 구분 |
| 링크 공개 Feedback 작성에 유효 share_token 조건을 포함했는가 | 통과 | 검증 위치는 추가 검토 |
| 승인된 Change Card 본문 수정 제한 방향을 정했는가 | 부분 통과 | 제한 방향 확정, trigger/API 방식 미확정 |
| 승인된 Change Card 공개 상태/민감도 변경 가능 여부를 정했는가 | 부분 통과 | Owner 변경 가능 후보 |
| Rough Note와 AI Draft 공개 차단을 유지했는가 | 통과 | 모든 공개 정책 제외 |
| 관리자 권한을 1차 migration에서 제외했는가 | 통과 | 제외 유지 |
| 팀/공동 편집/조직 권한을 제외했는가 | 통과 | 제외 유지 |
| 7.5 테스트 케이스와 8단계 RLS 초안 매핑을 확인했는가 | 통과 | 매핑 문서 존재 |
| 8.5 보안 보정 문서를 9단계 migration draft의 입력으로 사용할 준비가 되었는가 | 부분 통과 | token 검증 위치 결정 필요 |

## 4. 9단계 진입 조건

9단계로 넘어갈 수는 있지만, migration draft 초입에서 다음을 반드시 결정해야 한다.

- token 검증 위치
- token hash 저장 방식
- public-safe 응답 경계
- 승인된 Change Card 수정 제한 구현 후보
- Feedback 작성자 위조 방지 구현 후보
