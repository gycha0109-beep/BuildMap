# Actor Fixture

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## fixture 원칙

아래 UUID는 local smoke test용 fixture 후보이다. 실제 사용자 ID가 아니며 remote DB에 사용하지 않는다. 이번 단계에서는 실제 `auth.users` row가 없어도 SQL session claim 설정만으로 `auth.uid()` 반환값을 확인할 수 있는지 검증한다.


| Actor | Smoke test UUID | 기대 `auth.uid()` 결과 | 후속 용도 |
|---|---:|---:|---|
| `anon` | 없음 | `null` | 비로그인 read/write 차단 기준 |
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | `00000000-0000-0000-0000-000000000101` | Project Owner, Builder 권한 검증 |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | `00000000-0000-0000-0000-000000000102` | non-owner deny 검증 |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | `00000000-0000-0000-0000-000000000103` | Feedback author spoofing 검증 |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | `00000000-0000-0000-0000-000000000104` | link_shared Feedback 작성 검증 |


## actor별 설명

### anon

- 목적: 비로그인 actor에서 `auth.uid()`가 `null`인지 확인한다.
- 기대 결과: `null`.
- 후속 테스트: anon read/write 차단, public-safe view read 후보.

### authenticated_owner

- 목적: Project Owner 정책의 기준 actor다.
- UUID: `00000000-0000-0000-0000-000000000101`.
- 후속 테스트: Project update, Change Card approve/publish, Feedback Request 생성.

### authenticated_non_owner

- 목적: non-owner deny 정책을 검증한다.
- UUID: `00000000-0000-0000-0000-000000000102`.
- 후속 테스트: private Project read 차단, Project update 차단, Change Card approve 차단.

### feedback_author

- 목적: Feedback author spoofing 방지의 기준 actor다.
- UUID: `00000000-0000-0000-0000-000000000103`.
- 후속 테스트: `author_user_profile_id = current_user_profile_id()` 조건 검증.

### link_shared_authenticated_user

- 목적: link_shared Project에서 authenticated + valid token 조건을 검증하는 actor다.
- UUID: `00000000-0000-0000-0000-000000000104`.
- 후속 테스트: `create_link_shared_feedback` RPC 후보.
