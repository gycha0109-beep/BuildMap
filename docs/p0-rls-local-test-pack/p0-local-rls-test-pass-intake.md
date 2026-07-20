# P0 Local RLS Test PASS Intake

## 목적

이 문서는 Phase20 네 번째 로컬 실행 결과를 바탕으로 P0 local RLS 검증 범위의 PASS intake를 정리한다.

주의: 이 문서는 사용자가 제공한 로그와 wrapper 실행 완료 사실에 근거한다. 작업자가 SQL/RLS/view/trigger를 재실행한 결과가 아니다.

## P0 scope별 intake

| Scenario group | Result | Evidence | Expected deny 여부 | Security impact | Remaining limitation |
|---|---|---|---|---|---|
| Project private/public read boundary | PASS, 제공 결과 기준 | `SUMMARY-020`, `SUMMARY-030`, `SUMMARY-034` | 일부 source direct deny | private Project external exposure blocker 없음 | 세부 scenario별 전문 로그는 별도 원문 필요 |
| owner vs non-owner Project boundary | PASS, 제공 결과 기준 | wrapper 전체 완료 및 authenticated projects SELECT summary | non-owner deny는 earlier SQL 결과에 의존 | owner/non-owner RLS path 실행 완료로 intake | 세부 row count 전문은 미첨부 |
| Rough Note external block | PASS, 제공 결과 기준 | `SUMMARY-031 anon rough_notes direct SELECT expected false: PASS` | EXPECTED_DENY 성격 | Rough Note 외부 노출 blocker 없음 | owner/non-owner 세부 출력은 미첨부 |
| AI Draft external block | PASS, 제공 결과 기준 | `SUMMARY-032 anon ai_structured_drafts direct SELECT expected false: PASS` | EXPECTED_DENY 성격 | AI Draft 외부 노출 blocker 없음 | owner/non-owner 세부 출력은 미첨부 |
| public Change Card boundary | PASS, 제공 결과 기준 | `SUMMARY-008 public_change_cards: 1`, `SUMMARY-020 blocked_cards=0` | sensitive/draft/internal/private card exclusion | external card boundary blocker 없음 | 세부 scenario line 일부만 제공됨 |
| private Project published Change Card block | PASS, 제공 결과 기준 | `SUMMARY-020 blocked_cards=0` | EXPECTED_DENY 성격 | private Project 하위 published card 외부 노출 blocker 없음 | 세부 row id 전문은 미첨부 |
| sensitive Change Card external block | PASS, 제공 결과 기준 | `SUMMARY-020 blocked_cards=0` | EXPECTED_DENY 성격 | sensitive card external exposure blocker 없음 | 세부 scenario line은 미첨부 |
| draft/internal Change Card block | PASS, 제공 결과 기준 | `SUMMARY-020 blocked_cards=0` | EXPECTED_DENY 성격 | draft/internal card external exposure blocker 없음 | 세부 scenario line은 미첨부 |
| Feedback authenticated insert boundary | PASS, 제공 결과 기준 | `SUMMARY-006 fixture feedbacks: 2`, `SUMMARY-010 feedback actor fixture: 2` | anon insert deny는 P0 SQL expected deny에 의존 | feedback insert baseline 정상 | insert scenario 전문은 미첨부 |
| Feedback author spoofing block | PASS, 제공 결과 기준 | phase20 wrapper 전체 정상 종료 및 no actual `UNEXPECTED_ALLOW` | spoofing expected deny | author spoofing blocker 없음 | 세부 scenario line 전문은 미첨부 |
| public-safe view row/column boundary | PASS | `SUMMARY-009A/B`, `SUMMARY-015/016/017`, `SUMMARY-020` | private/internal/sensitive row exclusion | public view exposure blocker 없음 | full view table output은 미첨부 |
| approved Change Card core mutation trigger block | PASS | `TRG-P0-001`~`TRG-P0-007 EXPECTED_DENY`, `TRG-P0-008/009 PASS/RECORDED` | EXPECTED_DENY 핵심 | approved Change Card integrity blocker 없음 | 추가 P1/P2 trigger matrix는 보류 |

## 전체 PASS intake 근거

이번 intake에서 전체 P0 PASS로 정리하는 근거는 다음이다.

1. 사용자가 제공한 네 번째 실행 로그에서 후반 핵심 SQL 파일이 `ExitCode: 0`으로 종료됐다.
2. public-safe view 관련 summary가 전체 8개 view, `security_invoker` residual 0, `security_barrier` missing 0을 보고했다.
3. anon source direct privilege deny가 projects, rough_notes, ai_structured_drafts, feedbacks에서 PASS로 보고됐다.
4. approved Change Card mutation trigger 핵심 deny가 모두 `EXPECTED_DENY`로 보고됐다.
5. actual `UNEXPECTED_ALLOW`, actual `VIEW_BOUNDARY_FAIL`, actual `VIEW_ACCESS_ERROR`, actual `GRANT_FAIL`, actual `ACCESS_PATH_MISMATCH`, uncaught SQL `ERROR`는 사용자 제공 근거에서 확인되지 않았다.
6. wrapper final scan의 blocker flags는 instruction/search-hint/header 문자열 충돌로 인한 false positive로 분석됐다.

## 보류 범위

P0 이후에도 다음은 아직 별도 검증 대상이다.

- link sharing secure RPC full matrix
- token rotation/revocation
- P1/P2/P3 RLS scenario
- full function permission audit
- full trigger matrix
- API integration
- frontend integration
- remote migration readiness


## Phase23.5 보정과 기존 PASS 판정

Phase23.5는 기존 P0 PASS 판정을 취소하지 않는다. 다만 future false-negative를 줄이기 위해 exact oracle, full taxonomy, scenario coverage manifest를 추가했다. 기존 실행에서 `TRG-P0-008`, `TRG-P0-009`는 실제로 `PASS/RECORDED`였으므로 기존 PASS 판정에는 영향을 주지 않는다.
