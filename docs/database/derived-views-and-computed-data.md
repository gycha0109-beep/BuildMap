# 파생/표현 데이터 처리 방식

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 기본 원칙

1차 구현에서는 가능한 한 원천 데이터에서 파생해서 보여준다. 파생/표현 데이터를 원천처럼 중복 저장하면 불일치 위험이 생긴다.

## 2. 파생/표현 구조 요약

| 파생/표현 구조 | 원천 데이터 | 파생 방식 | 1차 별도 저장하지 않는 이유 | 후순위 확장 |
|---|---|---|---|---|
| Decision Timeline | 승인된 Change Card | 시간, 중요도, 공개 상태, 연결 관계 기준으로 표시 | Change Card와 중복 원천 방지 | 읽기 최적화 뷰/캐시 |
| Public Project Page | Project, Problem Definition, Hypothesis, 공개 가능한 승인 Change Card, Feedback Request | 공개 상태에 따라 조합 | 별도 소개글화 방지 | 스냅샷/SEO 캐시 |
| Project Card Grid | Project, 최근 승인 Change Card, Feedback Request | 카드 표시 정보로 요약 | 탐색 화면은 표현 구조 | 검색 인덱스 |
| 최근 전환 요약 | 핵심 전환 Change Card | 최근 승인된 핵심 전환 카드에서 추출 | 중복 저장 위험 | 캐시 후보 |
| 공개 변화 카드 목록 | 공개됨 상태의 승인 Change Card | 공개 상태 필터 | 원천은 Change Card | 공개 페이지 캐시 |
| 간단한 Decision Diff | Change Card, 현재 Problem/Hypothesis 상태 | 초기 판단 vs 현재 판단 비교 | 별도 수동 문서화 방지 | diff snapshot 후보 |
| Activity Signal 요약 | Change Card, Feedback Request, Feedback, Project 업데이트 | 최근 활동 후보 계산 | 히트맵 산식 보류 | activity_signals 후보 |
| 탐색 정렬용 최근 업데이트 | Project 업데이트, 승인 Change Card | 최신 업데이트 시점 사용 | 단순 정렬은 Project 시점으로 충분 | 활동 지표 테이블 |

## 3. Decision Timeline

Decision Timeline은 `change_cards`에서 파생된다.

파생 기준 후보:

- 작업 상태가 승인됨
- 공개 Timeline에서는 공개 상태가 공개됨
- 내부 Timeline에서는 내부 전용 포함
- 생성 시점 또는 승인 시점
- 중요도
- 연결된 문제 정의 또는 가설

1차에서 별도 저장하지 않는 이유:

- Timeline을 별도 원천으로 만들면 Change Card와 중복된다.
- 카드 수정과 Timeline 표시 사이에 불일치가 생긴다.

후순위 확장:

- 트래픽이 많아지면 읽기 전용 캐시 또는 뷰를 검토한다.
- 공개 Timeline SEO 요구가 생기면 스냅샷을 검토한다.

## 4. Public Project Page

Public Project Page는 별도 원천 테이블이 아니라 공개 뷰다.

원천 데이터:

- Project
- Problem Definition
- Hypothesis
- 공개 가능한 승인 Change Card
- Feedback Request
- 선택 공개된 Feedback
- Project Link 후보

1차에서 별도 저장하지 않는 이유:

- 별도 소개글처럼 분리되면 BuildMap의 핵심인 판단 흐름이 약해진다.
- Project 데이터와 공개 페이지 데이터가 불일치할 수 있다.

## 5. Project Card Grid

Project Card Grid는 1차 탐색 구조다.

원천 데이터:

- Project 이름, 한 줄 정의, 진행 상태, 공개 상태
- 현재 필요한 것 요약
- 최근 승인 Change Card
- Feedback Request 상태
- Builder Profile 공개 정보

히트맵은 후순위 실험 화면이다.

## 6. Decision Diff

Decision Diff는 코드 diff가 아니라 판단 diff다.

1차에서는 별도 저장 없이 다음을 기반으로 단순 좌우 비교한다.

- 초기 문제 정의 또는 관련 Change Card
- 현재 Problem Definition
- 초기 가설 또는 관련 Change Card
- 현재 Hypothesis
- 방향 전환 또는 문제 정의 수정 Change Card

후순위로 snapshot 후보를 검토할 수 있지만, 수동 작성 문서가 되지 않도록 주의한다.

## 7. Activity Signal 요약

Activity Signal은 1차 선택이다.

활동 신호 후보:

- Change Card 생성 또는 승인
- 공개 업데이트
- Feedback Request 생성
- Feedback 수
- 테스터 신청 후보
- Save/Follow 후보

히트맵 산식, 점수화, 자동 랭킹은 보류한다.

## 8. 불일치 위험

파생/표현 데이터를 저장하면 다음 위험이 생긴다.

- Change Card 수정 후 Timeline 캐시가 갱신되지 않음
- Project 공개 상태 변경 후 공개 페이지 스냅샷이 틀림
- Feedback 공개 선택이 바뀌었는데 공개 페이지에 계속 노출됨
- Decision Diff가 현재 판단과 불일치함

1차에서는 불일치 위험을 줄이기 위해 파생 계산을 우선한다.
