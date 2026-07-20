# Phase25 PASS Baseline

## 최종 판정

```text
Phase25 link sharing RPC local run completed. OverallResult: PASS
```

사용자가 2026-07-20 로컬 Docker Supabase 환경에서 직접 실행한 결과다.

## 검증된 범위

- preflight 및 function ownership/search path/ACL
- link fixture seed
- 정상·오류·cross-project read RPC
- token rotate/revoke/reactivate lifecycle
- private/public/archived 상태 전환
- owner/non-owner write boundary
- authenticated Feedback 작성 및 author 강제 바인딩
- internal hash helper 비노출
- response payload key/column exposure boundary
- 8개 SQL 파일의 expected/observed scenario coverage

## 수용된 수치

| 구분 | 수치 |
|---|---:|
| SQL 파일 | 8 |
| 전체 expected scenario | 107 |
| preflight | 19 |
| seed | 10 |
| read RPC | 21 |
| token lifecycle | 14 |
| feedback RPC | 12 |
| RPC permission/security | 12 |
| response exposure | 10 |
| result summary | 9 |

## 증거 수준

- 사용자 완료 문구: 확보
- 사용자 실행 환경에서 `OverallResult: PASS`: 확인 보고됨
- 전체 raw log: 현재 프로젝트 ZIP에 미포함
- 현재 작업 환경의 독립 실행: Docker/Supabase/PowerShell 부재로 미실행

따라서 기준선 상태는 `USER_LOCAL_PASS`다. `INDEPENDENT_RUNTIME_REPRODUCED`로 과장하지 않는다.

## 보호 원칙

Phase25 PASS 이후 migration draft, Phase25 SQL, wrapper가 변경되면 기존 PASS를 그대로 재사용할 수 없다. 변경 범위에 따라 최소 정적 검증과 전체 local rerun을 다시 수행해야 한다.
