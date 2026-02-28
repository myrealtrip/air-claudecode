# Google Calendar Manager

`gogcli` CLI를 통해 Google Calendar 일정을 관리합니다. 두 계정(개인 + 업무)을 병렬로 조회합니다.

## 사용 시점
- 일정, 캘린더, 미팅, 약속, 이벤트
- 한국어: "오늘 일정", "이번주 스케줄", "일정 추가해줘", "내일 뭐 있어"
- 캘린더가 조금이라도 관련이 있을 때 적극적으로 트리거

## 사용하지 않을 때
- Gmail, Drive 또는 캘린더가 아닌 다른 Google 서비스
- gogcli 설치/인증 관련 질문 -- `docs/gogcli-installation-guide.md` 참조

## 언어 및 타임존
- 모든 응답은 **한국어 존댓말**
- 기본: `Asia/Seoul` (KST, UTC+9)
- 시간은 해당 이벤트의 로컬 타임존으로 표시
- KST: 레이블 없음 / 비KST: 각 측에 독립적으로 `(현지)` 추가
- 비KST 이벤트가 있을 때 시차를 알리는 코멘트 추가

### 타임존 레이블링

| 시작 TZ | 종료 TZ | 표시 |
|---------|---------|------|
| KST | KST | `10:00 ~ 11:00` |
| KST | 비KST | `10:35 ~ 13:25 (현지)` |
| 비KST | 비KST | `10:30 (현지) ~ 16:30 (현지)` |
| 비KST | KST | `14:00 (현지) ~ 20:30` |

---

## 계정

- 첫 실행 시 `gog auth list --json`으로 계정 탐색
- 2개 이상 계정이 있으면 개인 vs 업무 매핑을 사용자에게 요청
- 인증 오류: `gog auth add <email> --services calendar --force-consent`

### 추가 캘린더 (리소스 / 구독)

조회 스크립트는 날짜 범위 이후 `account:calendarId` 인자를 통해 추가 캘린더 ID를 지원합니다.
`gog calendar calendars --account work --json`으로 탐색합니다.

---

## 일정 조회

1. **시간 범위 파싱** -- `--from`/`--to` 날짜로 변환. **주의 시작일은 일요일.**

2. **병렬 조회 스크립트 실행**
   ```bash
   python3 <skill_base_dir>/scripts/fetch_events.py <personal> <work> <from> <to> [extra_calendar_ids...]
   ```

3. **테이블 렌더링** (날짜별 그룹화, `workingLocation` 이벤트 제외)

**📅 2026-02-18 (Wed)**

| # | Acc | Event | Time | Location | RSVP | Attendees |
|---|---|---|---|---|---|---|
| 1 | 🔸 | Sprint Planning | 10:00 ~ 11:00 | Room A | ✅ Yes | Kim +5 |
| 2 | 🔹 | Dentist | 14:00 ~ 15:00 | Clinic | - | - |

- **#**: 모든 날짜에 걸친 순번 (수정/삭제 참조용)
- **Acc**: 🔹 개인 / 🔸 업무
- **Time**: `HH:MM ~ HH:MM`. 종일 → `All day` (테이블 상단)
- **RSVP**: ✅ 수락 / ❌ 거절 / ⏳ 대기 / `-`
- **Attendees**: `displayName` 사용 가능시 사용, 아니면 이메일에서 추출 (`juyong.kim@co.com` → `김주용(juyong)`). 3명 이하 전체 표시, 4명 이상 → `이름 +N`. 자기 자신 제외

4. **요약 코멘트** (💬) 유용할 때만: 3개 이상 미팅, 충돌, 연속 미팅, 빈 날, **생일** (🎂 축하 메시지)

---

## 생성 / 수정 / 삭제

- 실행 전 항상 **요약 및 확인**
- 마지막 조회의 행 **#**으로 이벤트 참조
- CLI 참조: `<skill_base_dir>/references/gogcli-commands.md`

### 생성
```bash
gog calendar create primary --account <acct> --summary "Title" \
  --from "2026-02-20T14:00:00+09:00" --to "2026-02-20T15:00:00+09:00" \
  --location "Room" --attendees "a@co.com,b@co.com" --json
```

### 수정
```bash
gog calendar update <calendarId> <eventId> --account <acct> \
  --summary "New Title" --from "..." --to "..." --json
```

### 삭제
```bash
gog calendar delete <calendarId> <eventId> --account <acct>
```

---

## 오류 처리

| 시나리오 | 해결 |
|----------|------|
| 인증 만료 | `gog auth add <email> --force-consent` |
| 이벤트 없음 | "해당 기간에 일정이 없습니다." |
| 미설치 | `brew install steipete/tap/gogcli` |
