# Share Token Dry-run Review

## 유지 결정

- `share_token` 원문 저장 금지.
- `share_token_hash` 저장 후보 유지.
- 1차 후보는 `encode(digest(token, 'sha256'), 'hex')`.
- `hmac`은 secret/pepper 관리가 필요한 후순위 보안 강화 후보.
- token 원문은 생성 시 1회 반환 후보.

## Dry-run 테스트 후보

| 테스트 목적 | 관련 파일 | 관련 RPC/helper | 입력 조건 | 기대 결과 | 실패 시 보정 |
|---|---|---|---|---|---|
| token 생성 | `07_link_sharing_rpc` | `rotate_project_share_token` | Owner, project_id | 원문 token 1회 반환, hash 저장 | owner check/hash 생성 보정 |
| token 원문 미저장 | `01_core_schema`, `07_link_sharing_rpc` | `hash_share_token_draft` | token 생성 후 조회 | 원문 컬럼 없음 | schema 보정 |
| 유효 token 접근 | `07_link_sharing_rpc` | `get_link_shared_project_page` | link_shared + valid token | public-safe json 반환 | hash 비교 보정 |
| 잘못된 token 접근 | `07_link_sharing_rpc` | read RPC | wrong token | 실패 응답 | 실패 조건 보정 |
| revoked token 접근 | `07_link_sharing_rpc` | `revoke_project_share_token` 후 read | revoked | 차단 | revoked 조건 보정 |
| private 전환 후 token 접근 | `07_link_sharing_rpc` | read RPC | Project private + valid token | 차단 | Project visibility 조건 보정 |
| public_slug만으로 link_shared 접근 | `07_link_sharing_rpc` | read RPC/view | public_slug only | 차단 | public_slug 경계 보정 |
| feedback 작성 | `07_link_sharing_rpc` | `create_link_shared_feedback` | valid token + login + public request | 허용 | auth/request 조건 보정 |
| 비로그인 feedback 작성 | `07_link_sharing_rpc` | `create_link_shared_feedback` | valid token + anon | 차단 | grant/auth check 보정 |

## pgcrypto 확인

`digest()` 사용을 위해 `pgcrypto` extension 후보가 필요하다. dry-run에서 extension 생성 권한과 함수 호출 문법을 확인한다.

## 실패 응답 통일

토큰 없음, 잘못됨, 폐기됨, private 전환은 모두 상세 원인을 노출하지 않는 통일 실패 응답을 권장한다.
