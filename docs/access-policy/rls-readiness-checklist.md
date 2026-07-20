# 실제 RLS SQL 작성 전 체크리스트

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 실제 RLS SQL을 작성하기 전에 반드시 확인해야 할 항목을 정리한다. 이 체크리스트를 통과하기 전에는 SQL, migration, `CREATE POLICY`를 작성하지 않는다.

## 2. 6.5 보정 반영 체크

- [ ] `docs/decisions/phase6-5-db-schema-corrections.md`를 확인했다.
- [ ] Change Card 공개 상태와 민감도 플래그를 분리했다.
- [ ] Project 링크 공개 식별자 후보를 고려했다.
- [ ] Feedback Request 대상 범위를 1차에서 Project / Change Card 중심으로 좁혔다.
- [ ] Rough Note 전환 후 수정/보존 정책을 반영했다.
- [ ] Change Card 작성자와 승인자 분리 가능성을 반영했다.
- [ ] `updated_at`과 `last_activity_at` 성격 차이를 인지했다.
- [ ] Auth User / App User Profile / Builder Profile 관계를 분리했다.

## 3. 공개/비공개 정책 체크

- [ ] `공개 가능`과 `공개됨`을 구분했다.
- [ ] 민감도와 공개 상태를 분리했다.
- [ ] Project 공개 상태와 Change Card 공개 상태를 함께 고려했다.
- [ ] 비공개 Project에서는 공개 상태의 Change Card도 외부에 노출하지 않도록 했다.
- [ ] 링크 공개와 전체 공개를 구분했다.
- [ ] share_token 생성/재발급/폐기 정책을 문서화했다.
- [ ] public_slug를 보안 토큰으로 사용하지 않도록 했다.

## 4. 내부 기록 보호 체크

- [ ] Rough Note를 기본 비공개로 두었다.
- [ ] AI Draft를 기본 비공개로 두었다.
- [ ] AI Draft가 공식 기록이 아님을 반영했다.
- [ ] Change Card 승인 전에는 Timeline에 반영하지 않도록 했다.
- [ ] 공개 Timeline 조건을 문서화했다.

## 5. Feedback 정책 체크

- [ ] Feedback은 Feedback Request를 통해서만 생성되도록 했다.
- [ ] Feedback 내용을 기본 내부 검토로 두었다.
- [ ] Builder가 선택한 Feedback만 공개 가능하도록 했다.
- [ ] 비로그인 Feedback을 제외했다.
- [ ] Feedback 작성자 표시 정보 노출 범위를 제한했다.

## 6. Profile 정책 체크

- [ ] user profile과 builder profile 공개 범위를 분리했다.
- [ ] 이메일과 인증 식별자를 공개하지 않도록 했다.
- [ ] Builder 공개 Profile에 노출 가능한 정보만 공개 페이지에 사용하도록 했다.

## 7. RLS 정책 문서화 체크

- [ ] RLS SQL 작성 전 정책 ID와 조건이 문서화되었다.
- [ ] Project 정책 그룹을 문서화했다.
- [ ] Change Card 정책 그룹을 문서화했다.
- [ ] Rough Note / AI Draft 정책 그룹을 문서화했다.
- [ ] Problem / Hypothesis 정책 그룹을 문서화했다.
- [ ] Feedback 정책 그룹을 문서화했다.
- [ ] Profile 정책 그룹을 문서화했다.
- [ ] Link Sharing 정책 그룹을 문서화했다.
- [ ] Access Policy Matrix를 검토했다.
- [ ] 권한/공개 정책 위험 문서를 검토했다.

## 8. 다음 단계 진입 조건

모든 필수 항목을 확인한 뒤에만 실제 RLS SQL 작성 또는 Supabase migration 설계로 넘어간다.
