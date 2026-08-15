# BuildMap Supabase Layout

## Current state

BuildMap의 Supabase staging에는 보호된 migration `00–10`의 exact version/name history가 이미 존재하며 Phase31 read-only reconciliation과 catalog validation을 통과했다.

Production deployment는 현재 `OUT_OF_SCOPE`다.

## `migrations_draft/`

검토·검증 과정에서 canonical source로 사용된 historical migration SQL을 보존한다.

## `migrations/`

Phase29 이후 replay/protection contract에서 사용한 mirror다. 현재 `00–10`은 historical lineage의 일부이므로 파일명에 `_draft`가 남아 있고 상단 주석에도 과거 단계의 `DRAFT ONLY` 문구가 존재한다.

이 문구는 현재 staging 상태를 의미하지 않는다. 해당 파일들은 이미 검증·reconciliation된 immutable history로 취급한다.

## Immutable boundary

기존 `00–10`에 대해서는 다음을 하지 않는다.

- SQL 본문 수정
- 파일명 변경
- 파일 삭제
- migration history repair
- remote reset
- 이미 적용된 staging에 동일 migration 재실행

기존 동작을 바꿔야 하면 과거 migration을 수정하지 말고 새 additive migration으로 처리한다.

## `.temp/`

`supabase/.temp/`는 Supabase CLI의 local transient state다. Git에 커밋하지 않는다.

## Credentials

Database password, access token, connection secret은 저장소 파일이나 command line에 기록하지 않는다. 필요 시 process environment에서만 전달하고 실행 후 제거한다.

`BUILDMAP_PHASE30*`, `BUILDMAP_PHASE31*`, `PGPASSWORD`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` 같은 문자열은 credential **변수 이름**일 수 있으며 그 자체는 secret 값이 아니다. 실제 값은 Git에 들어가면 안 된다.
