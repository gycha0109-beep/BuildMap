# Token Lifecycle Matrix

## 목적

`share_token`의 생성, 재발급, 폐기, Project 상태 전환에 따른 유효성 변화를 local-only fixture로 검증한다. Raw token은 저장하지 않고, 현재 hash와 Project 상태를 모두 만족할 때만 read/write RPC가 성공해야 한다.

## 토큰 계약

| 항목 | 기준 |
|---|---|
| entropy source | `extensions.gen_random_bytes(32)` |
| external representation | lowercase hex 64자 |
| stored value | SHA-256 hex hash 64자 |
| raw token storage | 금지 |
| rotate response | 성공 시 raw token 1회 반환 후보 |
| invalid input | 공개 실패 응답은 `not_found`로 통일 |

## Phase25 lifecycle scenarios

| Scenario | Actor / 상태 | 기대 결과 |
|---|---|---|
| `LINK-LIFE-001` | anon rotate 호출 | function EXECUTE `EXPECTED_DENY` |
| `LINK-LIFE-002` | authenticated non-owner rotate | `42501 / not_allowed` |
| `LINK-LIFE-003` | owner rotate | 64자 lowercase hex token 반환 |
| `LINK-LIFE-004` | rotate 후 저장값 | raw token이 아니라 정확한 SHA-256 hash |
| `LINK-LIFE-005` | rotate 전/후 token | old token 차단, new token 허용 |
| `LINK-LIFE-006` | authenticated non-owner revoke | `42501 / not_allowed` |
| `LINK-LIFE-007` | owner revoke | hash null, revoked timestamp 설정 |
| `LINK-LIFE-008` | revoked token read | `not_found` |
| `LINK-LIFE-009` | revoke 후 rotate | 새 token만 다시 유효 |
| `LINK-LIFE-010` | `link_shared → private` | 기존 token read 차단 |
| `LINK-LIFE-011` | `link_shared → public` | token RPC 경로 차단 |
| `LINK-LIFE-012` | owner repeated revoke | response와 최초 `share_token_revoked_at` 유지 |
| `LINK-LIFE-013` | archived Project rotate | `42501 / not_allowed` |
| `LINK-LIFE-014` | archived Project revoke | `42501 / not_allowed` |

## 핵심 판정

- 재발급 직후 기존 token이 성공하면 `TOKEN_LIFECYCLE_FAIL` 또는 `UNEXPECTED_ALLOW`다.
- 폐기 후 token이 성공하면 `UNEXPECTED_ALLOW`다.
- raw token과 DB 저장값이 같으면 `TOKEN_LIFECYCLE_FAIL`이다.
- 반복 revoke가 `share_token_revoked_at`을 변경하면 state-idempotence 실패다.
- private/public/archived Project에서는 hash가 존재하더라도 token RPC가 성공하면 안 된다.
- 서로 다른 Project에서 발급된 정상 형식 token을 교차 사용해도 `not_found`여야 한다.
