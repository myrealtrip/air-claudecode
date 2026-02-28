# Confluence Master

Confluence 페이지 작업을 위해 confluence-master 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:confluence-master <confluence 작업>
```

## 기능

- Confluence 페이지 CRUD (검색, 생성, 수정, 삭제)
- 댓글, 레이블, 첨부파일 관리
- 페이지 계층 탐색 (하위 페이지, 히스토리, 조회수)
- Confluence에서 공간(space)과 페이지를 사전 조회
- AskUserQuestion을 통한 대화형 선택
- Atlassian MCP 도구 (`mcp__mcp-atlassian__confluence_*`) 사용
- 모든 쓰기 작업 전 사용자 확인 필요

## 콘텐츠 생성

이 스킬은 페이지 콘텐츠를 **직접 생성하지 않습니다**. 문서 초안이나 기술 문서 작성이 필요하면 다음을 사용하세요:

```
/air-claudecode:technical-writing
```

그런 다음 이 스킬을 사용하여 작성된 콘텐츠를 Confluence에 게시하세요.
