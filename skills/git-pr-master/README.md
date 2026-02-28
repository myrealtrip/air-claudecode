# Git PR Master

GitHub Pull Request 작업을 위해 git-pr-master 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:git-pr-master <PR 작업>
```

## 기능
- GitHub PR CRUD (생성, 리뷰, 수정, 병합, 닫기)
- 단일 Bash 호출로 레이블, 마일스톤, 리뷰어, 담당자, 브랜치를 사전 조회
- 항상 타겟 브랜치를 묻습니다 (main, develop, release/*)
- 브랜치 이름에서 Jira 티켓을 자동 감지하여 연결
- 병합 사전 점검: CI 상태, 리뷰 승인, 충돌
- AskUserQuestion을 통한 대화형 선택
- `gh` CLI 사용, 선택적으로 Atlassian MCP를 통한 Jira 연동

## PR 본문 템플릿

PR 생성 시 본문에 다음 템플릿을 사용합니다:

```markdown
## Summary
- [1~3개 PR 설명 bullet points]

## Changes
- [ ] 변경 1
- [ ] 변경 2

## Related
- Jira: [PROJ-123](https://{jira-host}/browse/PROJ-123)
- Issue: #{issue-number}

## Test Plan
- [ ] 단위 테스트 추가/수정
- [ ] 수동 테스트 완료
- [ ] 엣지 케이스 확인

## Checklist
- [ ] 팀 컨벤션 준수
- [ ] 불필요한 변경 미포함
- [ ] 리뷰 요청 전 셀프 리뷰 완료
```
