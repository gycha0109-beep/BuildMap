# Test Execution Order


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 권장 실행 순서

| 순서 | 단계 | 목적 | 중단 조건 |
|---:|---|---|---|
| 1 | local-only safety check | remote 접근 방지 | remote 연결 의심 |
| 2 | local DB reset 확인 | schema 적용 상태 확보 | reset 실패 |
| 3 | `auth.uid()` simulation smoke test | actor 전제 검증 | smoke test 실패 |
| 4 | test data seed | FK/RLS 전제 데이터 준비 | seed 실패 |
| 5 | Project access tests | Project visibility/owner boundary | private data 노출 |
| 6 | Rough Note / AI Draft tests | 내부 기록 privacy | 외부 노출 |
| 7 | Change Card access tests | approved/published/sensitive 조건 | 내부/민감 card 노출 |
| 8 | Feedback tests | request/author integrity | author spoofing |
| 9 | Public-safe view tests | 공개 row/column boundary | 내부 컬럼 노출 |
| 10 | Link sharing tests | token/RPC 접근 | token 없이 허용 |
| 11 | Secure RPC tests | RPC 반환/권한 검증 | source row/hash 노출 |
| 12 | Function permission tests | execute grant 경계 | helper 과다 노출 |
| 13 | Trigger behavior tests | mutation/integrity 검증 | approved mutation 허용 |
| 14 | result classification | 실패 유형 분류 | blocker 우선 |
| 15 | log intake template 작성 | 19단계 입력 정리 | secret 마스킹 실패 |
| 16 | 다음 patch 여부 결정 | 후속 단계 선택 | P0 미해결 |

## 중단 조건

- `auth.uid()` simulation 실패
- test data seed FK 오류로 연쇄 실패
- remote DB 연결 의심
- secret/token/password 노출
- `UNEXPECTED_ALLOW` 보안 실패 발견
- public-safe view가 내부 식별자나 token hash를 노출
- Feedback author spoofing 허용
- Rough Note / AI Draft 외부 노출
- private Project의 published Change Card 외부 노출

## 재시작 기준

- actor simulation 보정 후 smoke test 재실행
- seed 오류 보정 후 local DB reset 또는 cleanup
- SQL patch 후 local db reset/lint/manual scenario 반복
