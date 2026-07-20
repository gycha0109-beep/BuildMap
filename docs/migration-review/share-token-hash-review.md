# Share Token Hash Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 유지 원칙

- `share_token` 원문 저장은 금지한다.
- `share_token_hash` 저장 후보를 유지한다.
- token 원문은 생성 시 1회 전달 후보로 둔다.
- `public_slug`는 보안 토큰이 아니다.

## 2. token hash 생성 위치 후보

| 후보 | 설명 | 장점 | 단점 | 1차 판단 |
|---|---|---|---|---|
| DB에서 hash 생성 | RPC/function 내부에서 hash 생성 | DB 내부 검증과 가까움 | token이 DB 함수 입력으로 들어옴 | secure RPC 사용 시 후보 |
| API에서 hash 생성 | API가 token을 hash해 DB에 저장/검증 | 로그/응답 통제 가능 | API 구현 전 DB 단독 검증 어려움 | API 조합 시 후보 |
| RPC에서 hash 비교 | RPC가 입력 token과 저장 hash 비교 | 링크 공개에 적합 | SECURITY DEFINER/search_path 위험 | 1차 강력 후보 |

## 3. hash 알고리즘 후보

| 후보 | 설명 | 판단 |
|---|---|---|
| `digest(token, 'sha256')` 후보 | pgcrypto 기반 단순 hash 후보 | secret 없는 hash라 token 난수성이 매우 중요 |
| `hmac(token, secret, 'sha256')` 후보 | secret/pepper 기반 keyed hash 후보 | secret 관리 방식 필요 |
| API 계층 HMAC 후보 | application secret으로 hash | DB secret 노출 감소 가능 |

## 4. salt / pepper 검토

- token 자체가 충분히 긴 random secret이면 salt 없이 hash 저장도 후보가 될 수 있다.
- 다만 token 길이와 난수성이 약하면 hash가 의미를 잃는다.
- `pepper` 또는 HMAC secret을 쓰면 secret 관리 문제가 생긴다.
- Supabase 환경에서 secret을 DB 함수에 어떻게 안전하게 제공할지 추가 검토가 필요하다.

## 5. token 길이와 난수성 후보

11단계 전 결정 필요:

- token 생성 위치
- token byte length
- base64url 또는 hex 표현 방식
- token 만료/재발급 정책
- token 폐기 시점

## 6. timing attack 검토

PostgreSQL에서 문자열 비교가 constant-time인지 보장된다고 단정하지 않는다. 고위험 공개 링크 token 검증이라면 timing attack 가능성은 후속 보안 검토 대상으로 남긴다.

1차 판단:

- token을 충분히 길고 랜덤하게 만든다.
- 원문 저장을 금지한다.
- hash 비교는 secure RPC/API 경계로 제한한다.
- token 비교 결과만 반환하고 세부 실패 이유는 외부에 노출하지 않는다.

## 7. 11단계 전 결정해야 할 항목

1. DB/RPC hash vs API hash
2. `digest` vs `hmac`
3. token 길이와 표현 방식
4. token 재발급 시 기존 hash 폐기 방식
5. token 검증 실패 응답 통일 방식
