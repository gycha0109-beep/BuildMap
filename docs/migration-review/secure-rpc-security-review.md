# Secure RPC Security Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 기준

링크 공개 데이터는 `share_token` 검증이 필요하므로 secure RPC 후보가 적절하다. 단, RPC는 권한 상승과 token 원문 취급 위험이 있으므로 엄격히 검수해야 한다.

## 2. RPC 후보별 검수

| RPC 후보 | 목적 | 로그인 필요 | `SECURITY DEFINER` 후보 | 반환 제한 | 주요 위험 | 보정 제안 | 관련 Test Case |
|---|---|---:|---:|---:|---|---|---|
| `get_link_shared_project_page` | 링크 공개 페이지 조회 | 아니오 후보 | 필요 가능성 있음 | 필수 | token 로그, row 과다 반환 | jsonb public-safe 응답만 반환 | `LINK-002`, `PP-003` |
| `get_link_shared_decision_timeline` | 링크 공개 Timeline 조회 | 아니오 후보 | 필요 가능성 있음 | 필수 | sensitive card 노출 | approved/published/normal 조건 반복 | `LINK-014`, `CC-009` |
| `get_link_shared_feedback_requests` | 링크 공개 Feedback Request 조회 | 아니오 후보 | 필요 가능성 있음 | 필수 | 내부 request 노출 | public request만 반환 | `LINK-015`, `FB-005` |
| `create_link_shared_feedback` | 링크 공개 Feedback 작성 | 예 | 필요 가능성 있음 | 반환 최소화 | author spoofing | current user로 author 강제 | `FB-019`, `FB-020` |

## 3. 필수 보안 검토

### 3.1 token 검증

- `share_token` 원문은 저장하지 않는다.
- 입력 token은 RPC 호출 중에만 사용한다.
- 저장된 `share_token_hash`와 비교한다.
- token 원문이 DB 로그, API 로그, 에러 메시지에 남지 않도록 해야 한다.

### 3.2 Project 상태

RPC는 token이 맞더라도 다음을 확인해야 한다.

- Project가 `link_shared` 상태인지
- Project가 `private`이면 차단되는지
- token이 revoked 상태가 아닌지
- token 재발급 이후 기존 token은 차단되는지

### 3.3 `SECURITY DEFINER`

`SECURITY DEFINER`를 쓰면 함수 소유자의 권한으로 실행될 수 있으므로 다음이 필요하다.

- `search_path` 고정
- 반환 컬럼 제한
- execute grant 최소화
- 입력 token 처리 최소화
- 내부 테이블 row 전체 반환 금지

### 3.4 `create_link_shared_feedback`

반드시 필요한 조건:

- 호출자는 로그인 사용자다.
- `current_user_profile_id()`가 존재한다.
- `feedback_request`가 공개 상태다.
- Project가 `link_shared` 상태다.
- token 검증을 통과한다.
- `author_user_profile_id`는 클라이언트 입력이 아니라 현재 사용자로 설정한다.

## 4. 반환 타입 검토

| 반환 방식 | 장점 | 단점 | 1차 판단 |
|---|---|---|---|
| `jsonb` | 유연하고 공개 페이지 응답 조합에 적합 | 타입 안정성 낮음 | 1차 후보 |
| composite type | 타입 명확, 문서화 좋음 | 변경이 번거로움 | 후순위 후보 |
| table return | SQL 친화적 | 컬럼 변경 관리 필요 | 추가 검토 |

1차에서는 `jsonb`가 유연하지만, 11단계에서 최소 응답 스키마를 문서화해야 한다.

## 5. 실제 적용 전 검증 사항

- `SECURITY DEFINER` 필요 여부
- `set search_path` 문법
- token hash 비교 방식
- RPC execute grant 범위
- 반환 데이터에 내부 ID/token hash 포함 여부
- 7.5 Link Sharing / Feedback 테스트 통과 여부
