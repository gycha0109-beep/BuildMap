# Migration Readiness Checklist

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

| 항목 | 상태 | 비고 |
|---|---|---|
| 8.5 보안 보정 문서를 반영했는가 | 통과 | 주요 결정 반영 |
| 실제 `.sql` 파일을 만들지 않았는가 | 통과 | 문서만 생성 |
| `share_token` 원문 저장 금지를 반영했는가 | 통과 | hash 후보만 사용 |
| `share_token_hash` 후보를 반영했는가 | 통과 | `projects` 후보 포함 |
| token 검증 위치를 secure RPC 우선 후보로 정리했는가 | 통과 | 최종 구현은 보류 |
| `public_slug`를 보안 토큰으로 사용하지 않도록 했는가 | 통과 | 전체 공개 경로 후보 |
| public-safe view 후보를 반영했는가 | 통과 | 전체 공개 응답 후보 |
| view owner/RLS 우회 위험을 문서화했는가 | 통과 | 추가 검증 필요 |
| 링크 공개 secure RPC 후보를 반영했는가 | 통과 | token 검증 후보 |
| 공개 Feedback row 전체 직접 노출 금지를 반영했는가 | 통과 | public view 제한 |
| Feedback 작성자 위조 방지 조건을 반영했는가 | 부분 통과 | helper/RPC 후보, 실제 검증 필요 |
| 승인된 Change Card 수정 제한 후보를 반영했는가 | 부분 통과 | trigger 후보, 실제 구현 보류 |
| Rough Note / AI Draft 외부 차단을 반영했는가 | 통과 | anon policy 없음 |
| 관리자/팀/조직 권한을 제외했는가 | 통과 | 1차 제외 |
| 7.5 Test Case ID와 RLS Policy ID를 migration draft와 연결했는가 | 부분 통과 | 대표 매핑 반영 |
| 실제 Supabase 문법 검증이 아직 필요하다고 명시했는가 | 통과 | 모든 SQL 초안에 경고 |

## 차단 항목

현재 9단계 문서 기준에서 실제 migration 작성 자체를 차단하는 확정 오류는 없다. 다만 다음은 10단계 이전에 결정해야 한다.

- token hash 알고리즘
- secure RPC 반환 구조
- public-safe view의 security behavior
- 승인된 Change Card 수정 제한 구현 위치
