# Phase26 Failure Classification

| 분류 | 의미 | 조치 |
|---|---|---|
| `PROTECTED_FILE_MISSING` | 기준선 파일 누락 | ZIP/작업 디렉터리 확인 |
| `HASH_MISMATCH` | Phase25 PASS 입력과 파일 불일치 | 변경 영향 리뷰 후 전체 rerun |
| `SCENARIO_CONTRACT_MISMATCH` | expected ID/count와 SQL 불일치 | oracle/manifest 수정 검토 |
| `POWERSHELL_PARSE_FAILURE` | runner/gate 구문 오류 | 실행 전 스크립트 수정 |
| `FORBIDDEN_REMOTE_PATTERN` | remote-capable 명령 패턴 | 즉시 제거하고 안전성 리뷰 |
| `PASS_LOG_INCOMPLETE` | PASS 로그 구조 불완전 | 원본 로그 재수집 |
| `PASS_LOG_BLOCKER_TRUE` | 최종 failure flag true | PASS로 수용 금지 |
| `PASS_LOG_COUNT_MISMATCH` | FileResult 또는 scenario 합계 불일치 | wrapper/로그 완전성 조사 |

실제 gate 출력은 모든 실패를 `GATE_FAIL:`로 표시하고 마지막에 `Phase26GateResult: FAIL`을 출력한다.
