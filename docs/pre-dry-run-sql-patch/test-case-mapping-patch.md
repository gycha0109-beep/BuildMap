# Test Case Mapping Patch

## 보강한 영역

| 영역 | 보강 내용 | 상태 |
|---|---|---|
| share_token 없음 | RPC token 필수 조건과 실패 응답 통일 | 반영 |
| 잘못된 share_token | hash 비교 실패 차단 | 반영 |
| revoked share_token | `share_token_revoked_at is null` 조건 | 반영 |
| 재발급 전 token | hash 교체 후보와 rotation 테스트 | 부분 반영 |
| public_slug만으로 link_shared 접근 | secure RPC token 필요 조건 | 반영 |
| public-safe view 컬럼 단위 노출 차단 | 내부 식별자/author/share_token_hash 제외 | 반영 |
| public Feedback 작성자 표시 | 익명/맥락 표시 | 반영 |
| approved Change Card mutation trigger | 핵심 필드/승인 필드 제한 | 반영 |
| feedback_requests project consistency | trigger 후보 추가 | 반영 |
| Feedback author spoofing | helper/RLS/trigger/RPC 후보 연결 | 반영 |
| 비공개 Project의 공개 Change Card 차단 | Project public 조건 유지 | 반영 |
| Rough Note / AI Draft 외부 차단 | public view 제외, Owner-only RLS 유지 | 반영 |

## 아직 부분 반영인 영역

- token 재발급 전/후 token 검증은 실제 hash 교체 동작 dry-run 필요
- public-safe view source table grant/RLS 동작은 dry-run 필요
- approved Change Card mutation trigger는 OLD/NEW 비교 문법 검증 필요

## dry-run에서 검증할 영역

- `LINK-*`
- `CC-MUT-*`
- `FR-CONS-*`
- `FB-AUTH-*`
- `PP-COL-*`
- `RNAI-*`

## 7.5 / 8단계 / 11단계 / 13단계 연결

상세 매핑은 `docs/migration-file-draft/test-case-policy-file-mapping.md`의 `13단계 Patch 보강 매핑`을 기준으로 한다.
