# BuildMap Handoff Documents

## 목적

대화 제한, 작업자 변경, 장기 중단 이후에도 BuildMap을 실제 기준선에서 재개하기 위한 누적 handoff 영역이다.

## canonical 문서

- `CURRENT-HANDOFF.md`: 현재 상태, 보호 기준선, 다음 재개 지점
- `phase-history.md`: 단계별 누적 이력
- `handoff-update-checklist.md`: 이후 단계 완료 시 필수 갱신 항목

## 갱신 규칙

각 단계 완료 시 다음을 수행한다.

1. `CURRENT-HANDOFF.md`의 현재 단계와 다음 재개 지점을 갱신한다.
2. `phase-history.md`에 새 단계의 목적·변경·검증·잔여 리스크를 추가한다.
3. 보호 기준선 또는 실행 결과가 바뀌면 정확한 증거 수준을 기록한다.
4. 실행하지 않은 명령이나 확인하지 않은 상태를 PASS로 기록하지 않는다.
5. remote 적용 금지 등 안전 제약을 삭제하지 않는다.
6. 결과 ZIP의 파일명과 SHA-256을 최종 보고 후 handoff에 반영할 수 있다.

handoff는 기존 상세 문서를 대체하지 않는다. 새 작업자가 어떤 상세 문서부터 읽어야 하는지 안내하는 canonical resume index다.
