# air-claudecode

**Claude Code 팀을 위한 경량 스킬 공유 플러그인. 의존성 없음, 설정 없음.**

---

## 요구사항

| 도구                                                          | 필수 여부           | 설명                                                                                       |
|---------------------------------------------------------------|---------------------|---------------------------------------------------------------------------------------------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | 필수                | Anthropic 공식 CLI                                                                          |
| [GitHub CLI (gh)](https://cli.github.com/)                    | 필수                | GitHub 커맨드라인 도구 ([설치 가이드](docs/install-guide/gh-installation-guide.md))          |
| [MCP Atlassian](https://github.com/sooperset/mcp-atlassian)   | Jira/Confluence 사용 시 | Atlassian MCP 서버 ([설치 가이드](docs/install-guide/mcp-atlassian-installation-guide.md))   |
| [gogcli](https://github.com/steipete/gogcli)                 | Google Calendar 사용 시  | Google Workspace CLI ([설치 가이드](docs/install-guide/gogcli-installation-guide.md))        |

---

## 설치

### 1. 마켓플레이스 추가

Claude Code에서 실행:

```
/plugin marketplace add https://github.com/myrealtrip/air-claudecode
```

### 2. 플러그인 설치

```
/plugin install air-claudecode
```

### 3. 설치 확인

```
/air-claudecode:setup
```

모든 사전 요구사항(Claude Code, gh CLI, Atlassian MCP, gogcli)을 확인하고 누락된 의존성을 알려준다.

### 4. 사용 시작

```
/air-claudecode:git-commit
/air-claudecode:jira-master
```

---

## 업데이트

### 최신 버전으로 업데이트

```
/plugin marketplace update air-claudecode
/plugin update air-claudecode
```

### 재설치 (업데이트 실패 시)

```
/plugin uninstall air-claudecode
/plugin install air-claudecode
```

---

## 프로젝트 컨벤션

팀 개발 컨벤션은 [`conventions/project-conventions/`](conventions/project-conventions/)에 정리되어 있다.

---

## 문서

- [동작 원리 & 사용 예시](docs/how-it-works.md)
- [GitHub CLI 설치 가이드](docs/install-guide/gh-installation-guide.md)
- [MCP Atlassian 설치 가이드](docs/install-guide/mcp-atlassian-installation-guide.md)
- [gogcli 설치 가이드](docs/install-guide/gogcli-installation-guide.md)
- [Git Flow 설정 가이드](docs/install-guide/git-flow-installation-guide.md)

---

## 만든 사람

- **YoungKwang Kim** - [@gykk16](https://github.com/gykk16)
- **SungHoon Lee** - [@hooniis](https://github.com/hooniis)
