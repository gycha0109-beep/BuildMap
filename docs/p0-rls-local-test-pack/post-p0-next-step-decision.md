# Post-P0 Next Step Decision

## 목적

이 문서는 Phase20 P0 local RLS test PASS intake 이후 다음 검증 단계를 결정한다.

## 현재 판정

| 항목 | 판정 |
|---|---|
| P0 local RLS test intake | PASS, 사용자 제공 로그 기준 |
| public-safe view runtime verification | PASS, 사용자 제공 로그 기준 |
| approved Change Card mutation trigger | PASS, 사용자 제공 로그 기준 |
| wrapper final scan | false positive, Phase23에서 보정 |
| remote 적용 | 없음 |
| 정식 migration 승격 | 없음 |

## 다음 선택지

### 1순위: Link Sharing Secure RPC Full Matrix

권장 우선순위는 Link Sharing Secure RPC Full Matrix다.

검증해야 할 핵심 영역:

- missing token denied
- wrong token denied
- revoked token denied
- old token after rotation denied
- valid token link-shared project page read
- private transition after token issue
- token rotation/revocation behavior
- authenticated shared access
- secure RPC `SECURITY DEFINER` / `search_path`
- RPC `EXECUTE` privilege
- token failure response 통일성
- internal id/hash/token 미노출

이유: P0에서는 의도적으로 link sharing full matrix를 제외했다. 하지만 BuildMap의 외부 공유 보안 경계와 직접 연결되므로 P1/P2 일반 RLS보다 먼저 확인할 가치가 높다.

### 2순위: P1/P2 Manual RLS Scenario Pack

P0가 막은 core blocker 이후, 일반 owner update, publish/visibility 전환, feedback review status, additional negative path를 확장 검증한다.

## 이번 Phase23에서 수행하지 않는 것

- link sharing RPC test 실행
- P1/P2 script 작성
- SQL patch
- remote migration
- 정식 migration 승격
- API/frontend integration

## 재실행 정책

Phase23 이후 전체 phase20 wrapper 재실행은 필수가 아니다.

다음 조건이 유지되면 P0 PASS intake는 유지할 수 있다.

1. Phase23에서 SQL/migration/P0 scenario를 수정하지 않았다.
2. wrapper signal scan만 수정했다.
3. 사용자의 네 번째 실행에서 확인된 SQL 파일들이 `ExitCode: 0`이었다.
4. result summary가 PASS를 보고했다.
5. actual failure scenario line이 제공 로그에 없었다.

단, wrapper의 `OverallResult: PASS` 출력까지 확인하고 싶다면 사용자가 local-only로 한 번 더 실행할 수 있다. 이 경우는 “필수 P0 재검증”이 아니라 “wrapper classification verification”이다.
