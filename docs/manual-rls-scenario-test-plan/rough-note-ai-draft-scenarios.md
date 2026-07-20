# Rough Note / AI Draft Scenarios

Rough Note와 AI Structured Draft가 공개 정책에서 완전히 제외되는지 검증한다.

| Scenario ID | 관련 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | 실패 시 심각도 | 관련 SQL draft 파일 |
|---|---|---|---|---|---|---|---|
| RNAI-MAN-001 | RNAI-RN-002 | project_owner_builder | owner rough note | rough_notes select 후보 | owner read rough note 가능 후보 | high | `05_rls_policies` |
| RNAI-MAN-002 | RNAI-RN-003 | authenticated_non_owner | non-owner rough note | rough_notes select 후보 | non-owner read rough note 차단 | blocker | `05_rls_policies` |
| RNAI-MAN-003 | RNAI-RN-004 | anon | rough note | rough_notes/public view read 후보 | anon read rough note 차단 | blocker | `05_rls_policies` |
| RNAI-MAN-004 | RNAI-RN-006 | anon | public project + rough note | public-safe view read 후보 | public project에서도 rough note 차단 | blocker | `06_public_safe_views` |
| RNAI-MAN-005 | RNAI-AI-002 | project_owner_builder | owner AI draft | ai_structured_drafts select 후보 | owner read AI draft 가능 후보 | high | `05_rls_policies` |
| RNAI-MAN-006 | RNAI-AI-003 | authenticated_non_owner | non-owner AI draft | ai_structured_drafts select 후보 | non-owner read AI draft 차단 | blocker | `05_rls_policies` |
| RNAI-MAN-007 | RNAI-AI-004 | anon | AI draft | ai_structured_drafts/public view read 후보 | anon read AI draft 차단 | blocker | `05_rls_policies` |
| RNAI-MAN-008 | RNAI-AI-005, RNAI-AI-006 | anon | public project with rough note/AI draft | public_* view column/row 확인 | public-safe view에 rough note / AI draft 미포함 | blocker | `06_public_safe_views` |

## 공통 주의

이번 단계에서는 실행하지 않는다. 17단계에서 local-only manual test로 수행한다.
