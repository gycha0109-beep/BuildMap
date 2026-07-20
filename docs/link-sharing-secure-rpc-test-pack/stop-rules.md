# Stop Rules

즉시 중단:

- remote DB URL 또는 remote command 발견
- password/token/key가 로그에 노출
- preflight에서 PUBLIC EXECUTE 존재
- anon이 rotate/revoke/create feedback/hash helper 실행 가능
- non-owner가 rotate/revoke 성공
- wrong/revoked/private/public/archived token이 read 성공
- old token이 rotation 후 성공
- token이 revocation 후 성공
- sensitive/draft/internal Change Card 노출
- sensitive-linked/internal/closed Feedback Request 노출 또는 작성
- feedback author가 현재 user profile과 다름
- raw token 또는 `share_token_hash`가 read response에 노출
- missing/duplicate/conflicting scenario

broad anon source-table grant를 해결책으로 추가하지 않는다.
