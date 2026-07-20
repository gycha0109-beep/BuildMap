# Migration Boundaries

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 허용되는 작업

9단계에서 허용되는 것은 문서화다.

- 문서 안의 SQL 초안 작성
- table 후보 정리
- field 후보 정리
- check constraint 후보 정리
- foreign key 후보 정리
- RLS policy 후보 정리
- public-safe view 후보 정리
- secure RPC 후보 정리
- helper function 후보 정리
- trigger 후보 정리
- index 후보 정리
- manual verification plan 정리

## 2. 금지되는 작업

9단계에서는 다음을 하지 않는다.

- 실제 `.sql` migration 파일 생성
- `supabase/migrations` 디렉터리 생성
- Supabase CLI 실행
- DB 연결
- SQL 실행
- 실제 정책 적용
- helper function 실제 생성
- secure RPC 실제 생성
- API route 구현
- 프론트엔드 구현
- 테스트 코드 작성

## 3. SQL 초안의 사용 방식

SQL 초안은 다음 목적에만 사용한다.

1. 테이블 간 관계 검토
2. RLS 정책 조건 검토
3. 7.5 Test Case ID와 연결 검토
4. migration 순서 검토
5. 보안 위험 검토

SQL 초안은 복사해서 실행하지 않는다.

## 4. 다음 단계에서 필요한 조치

실제 migration 단계로 가기 전에 다음을 별도 확인한다.

- Supabase/PostgreSQL 문법 검증
- RLS helper function 보안 검토
- `share_token_hash` 검증 구조 확정
- public-safe view가 RLS를 우회하지 않는지 검토
- 수동 테스트 케이스 실행 계획 확정
