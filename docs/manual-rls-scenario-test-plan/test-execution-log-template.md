# Test Execution Log Template

17단계 수동 테스트 실행 시 아래 양식을 사용한다.

```markdown
## Test Log Entry

- Scenario ID:
- Test Case ID:
- 실행 일시:
- 실행자:
- 환경:
- actor:
- 관련 SQL draft 파일:
- 전제 데이터:
- 실행 SQL 또는 RPC:

```sql
-- secret/token 원문은 기록하지 않는다.
```

- 기대 결과:
- 실제 결과:
- pass/fail:
- result classification:
- error message:
- secret masking 여부:
- 관련 row id masking 여부:
- 다음 조치:
```

## 기록 원칙

- remote 정보, secret, raw share_token은 기록하지 않는다.
- 실패 로그는 원문 전체보다 재현 가능한 최소 요약을 우선한다.
- `UNEXPECTED_ALLOW`는 즉시 blocker 후보로 표시한다.
- 테스트 데이터 오류와 정책 오류를 구분한다.
