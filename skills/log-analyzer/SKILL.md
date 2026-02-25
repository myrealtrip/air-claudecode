---
name: log-analyzer
description: Log search and analysis specialist -- query, filter, aggregate logs from OpenSearch with KST timestamps
context: fork
agent: log-analyzer
model: sonnet
argument-hint: "[query or description] [--index index-name] [--from 1h|30m|2d] [--level ERROR|WARN]"
---

# Log Analyzer

Routes to the log-analyzer agent for log search and analysis tasks.

## Usage

```
/air-claudecode:log-analyzer <query or description>
```

## Examples

```
/air-claudecode:log-analyzer 최근 1시간 ERROR 로그 조회
/air-claudecode:log-analyzer OOM 관련 로그 분석
/air-claudecode:log-analyzer --index app-logs-* --from 2h --level ERROR payment 관련 에러
/air-claudecode:log-analyzer 최근 30분간 5xx 에러 트렌드 분석
```

## Capabilities

- Log search with time range, log level, keyword filters
- Error pattern analysis and grouping
- Time-series trend analysis (error rate spikes, latency patterns)
- Stack trace extraction and root-cause suggestions
- All timestamps displayed in KST (UTC+9)
- Currently supports OpenSearch as log supplier (extensible to other suppliers)
