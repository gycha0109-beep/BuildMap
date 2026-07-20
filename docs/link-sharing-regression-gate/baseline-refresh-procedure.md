# Baseline Refresh Procedure

## 자동 갱신 금지

`phase26_link_sharing_regression_baseline.json`은 실행 중 자동으로 다시 쓰지 않는다.

자동 갱신 기능은 다음 위험을 만든다.

- 회귀 발생 파일을 새 정상값으로 덮어씀
- scenario 삭제를 기준선 축소로 은폐
- wrapper 분류 약화를 정상 변경으로 수용
- 실제 SQL PASS 없이 문서상 PASS 생성

## 갱신 허용 조건

모두 충족해야 한다.

1. 새 phase scope/decision 문서 존재
2. 변경 파일과 보안 영향 기록
3. migration/RPC/RLS/GRANT 독립 리뷰
4. scenario oracle 및 manifest 리뷰
5. PowerShell parse PASS
6. clean local `supabase db reset` PASS
7. Phase25 전체 matrix `OverallResult: PASS`
8. Phase26 log attestation PASS
9. handoff/current baseline 갱신

## 새 baseline에서 유지할 항목

- 이전 baseline ID와 변경 이유
- 이전 PASS 결과를 폐기하지 않는 이력
- 새로운 protected file hash
- scenario count 증가·감소 이유
- raw log 포함 여부
- 다음 재개 지점

## scenario 감소

scenario 감소는 일반적인 정리 작업으로 처리하지 않는다. 제거된 oracle이 실제로 중복인지, security boundary가 축소된 것인지 별도 판단해야 한다.
