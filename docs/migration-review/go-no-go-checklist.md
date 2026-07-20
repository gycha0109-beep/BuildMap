# Go / No-Go Checklist

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 목적

이 문서는 11단계 실제 migration 파일 작성으로 넘어가기 전 Go / Conditional Go / No-Go 판단을 정리한다.

상태 값:

- Go
- Conditional Go
- No-Go
- 추가 검토 필요
- 후순위 제외

## 2. 체크리스트

| 항목 | 상태 | 판단 근거 | 다음 조치 |
|---|---|---|---|
| 실제 migration 파일 작성 가능 여부 | Conditional Go | 문서 초안은 충분하나 blocker 보정 필요 | 11단계 초반 보정 후 파일화 |
| public-safe view 보안 검토 | Conditional Go | 방향은 맞지만 security_invoker/grant 검증 필요 | 공식 문서 + dry-run |
| secure RPC 보안 검토 | Conditional Go | 방향은 맞지만 SECURITY DEFINER/search_path 검증 필요 | RPC 보안 template 확정 |
| share_token hash 결정 | 추가 검토 필요 | 알고리즘 미확정 | digest/hmac/API hash 결정 |
| RLS policy syntax 검토 | Conditional Go | USING/WITH CHECK 보강 필요 | 실제 SQL 작성 전 재검토 |
| trigger / constraint 검토 | Conditional Go | approved card mutation trigger 미확정 | trigger/app validation 결정 |
| Feedback integrity 검토 | Conditional Go | author spoofing 방지 필요 | WITH CHECK/helper/RPC로 강제 |
| Change Card mutation boundary | Conditional Go | 원칙은 명확, 구현 방식 미확정 | trigger 후보 작성 |
| Test Case mapping 검토 | Conditional Go | 대표 mapping은 있음 | 전체 ID mapping 보강 |
| 관리자/팀/조직 권한 제외 | Go | 1차 범위에서 제외 유지 | 유지 |
| 비로그인 Feedback 제외 | Go | 정책 일관 | 유지 |
| Rough Note / AI Draft 공개 차단 | Go | 정책 일관 | 유지 |
| 실제 Supabase 문법 검증 | 추가 검토 필요 | 아직 실행하지 않음 | 11단계 이후 lint/dry-run |

## 3. 전체 판단

현재 전체 판단은 **Conditional Go**다.

11단계로 넘어가 실제 migration 파일 초안을 작성할 수는 있지만, 다음 네 가지를 먼저 다루어야 한다.

1. `share_token_hash` 알고리즘 후보 결정
2. secure RPC `SECURITY DEFINER` / `search_path` / grant template 결정
3. Feedback author spoofing 방지 조건 확정
4. approved Change Card mutation 제한 방식 결정

## 4. No-Go 조건

다음 중 하나라도 11단계에서 해결하지 못하면 실제 적용 단계로 넘어가면 안 된다.

- 원천 table에 넓은 `anon` select를 열어 공개 row 전체가 노출됨
- `share_token` 원문을 저장함
- 공개 Feedback에 내부 식별자가 노출됨
- Feedback insert에서 작성자 위조가 가능함
- Rough Note / AI Draft가 공개 응답에 포함됨
- 관리자/팀/조직 권한이 1차 RLS에 섞임
