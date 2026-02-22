---
name: gog-calendar
description: Google Calendar manager -- list, create, update, delete events across personal and work accounts via gogcli
model: haiku
argument-hint: "[today's schedule] [this week] [add event] [delete event]"
---

# Google Calendar Manager

Manage Google Calendar events via `gogcli` CLI. Two accounts (personal + work) fetched in parallel.

## Use When
- Schedule, calendar, meeting, appointment, event
- Korean: "오늘 일정", "이번주 스케줄", "일정 추가해줘", "내일 뭐 있어"
- Trigger aggressively when calendar is even tangentially relevant

## Do Not Use When
- Gmail, Drive, or other non-calendar Google services
- gogcli installation/auth questions -- refer to `docs/gogcli-installation-guide.md`

## Language & Timezone
- All responses in **Korean 존댓말**
- Default: `Asia/Seoul` (KST, UTC+9)
- Display times in the event's local timezone
- KST: no label / Non-KST: append `(현지)` per side independently
- When non-KST events exist, add comment noting timezone difference

### Timezone Labeling

| Start TZ | End TZ | Display |
|---|---|---|
| KST | KST | `10:00 ~ 11:00` |
| KST | non-KST | `10:35 ~ 13:25 (현지)` |
| non-KST | non-KST | `10:30 (현지) ~ 16:30 (현지)` |
| non-KST | KST | `14:00 (현지) ~ 20:30` |

---

## Accounts

- `gog auth list --json` on first run to discover accounts
- Ask user to map personal vs. work if 2+ accounts
- Auth error: `gog auth add <email> --services calendar --force-consent`

### Extra Calendars (Resource / Subscribed)

Fetch script supports extra calendar IDs via `account:calendarId` args after date range.
Discover with `gog calendar calendars --account work --json`.

---

## List Events

1. **Parse time range** -- convert to `--from`/`--to` dates. **Week starts on Sunday.**

2. **Run parallel fetch script**
   ```bash
   python3 <skill_base_dir>/scripts/fetch_events.py <personal> <work> <from> <to> [extra_calendar_ids...]
   ```

3. **Render table** (grouped by date, skip `workingLocation` events)

**📅 2026-02-18 (Wed)**

| # | Acc | Event | Time | Location | RSVP | Attendees |
|---|---|---|---|---|---|---|
| 1 | 🔸 | Sprint Planning | 10:00 ~ 11:00 | Room A | ✅ Yes | Kim +5 |
| 2 | 🔹 | Dentist | 14:00 ~ 15:00 | Clinic | - | - |

- **#**: Sequential across all dates (for update/delete refs)
- **Acc**: 🔹 personal / 🔸 work
- **Time**: `HH:MM ~ HH:MM`. All-day → `All day` (top of table)
- **RSVP**: ✅ Accepted / ❌ Declined / ⏳ Pending / `-`
- **Attendees**: Use `displayName` if available, otherwise extract from email (`juyong.kim@co.com` → `김주용(juyong)`). ≤3 show all, 4+ → `Name +N`. Exclude self

4. **Summary comment** (💬) only when useful: 3+ meetings, conflicts, back-to-back, empty day, **birthdays** (🎂 축하 메시지)

---

## Create / Update / Delete

- Always **summarize and confirm** before executing
- Reference events by row **#** from last query
- CLI reference: `<skill_base_dir>/references/gogcli-commands.md`

### Create
```bash
gog calendar create primary --account <acct> --summary "Title" \
  --from "2026-02-20T14:00:00+09:00" --to "2026-02-20T15:00:00+09:00" \
  --location "Room" --attendees "a@co.com,b@co.com" --json
```

### Update
```bash
gog calendar update <calendarId> <eventId> --account <acct> \
  --summary "New Title" --from "..." --to "..." --json
```

### Delete
```bash
gog calendar delete <calendarId> <eventId> --account <acct>
```

---

## Error Handling

| Scenario | Fix |
|---|---|
| Auth expired | `gog auth add <email> --force-consent` |
| No events | "해당 기간에 일정이 없습니다." |
| Not installed | `brew install steipete/tap/gogcli` |
