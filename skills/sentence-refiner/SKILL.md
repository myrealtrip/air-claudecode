---
name: sentence-refiner
description: Korean sentence refiner following toss/technical-writing sentence rules
context: fork
agent: sentence-refiner
model: sonnet
argument-hint: "[file path or text to refine]"
---

# Sentence Refiner

Refine Korean technical documents by applying the 5 sentence rules from [toss/technical-writing](https://github.com/toss/technical-writing).

## Usage

```
/air-claudecode:sentence-refiner .claudedocs/technical-writing/redis-guide.md
/air-claudecode:sentence-refiner 이 문서 문장 다듬어줘
```

## Capabilities

- Apply 5 sentence rules: subject clarity, conciseness, concreteness, natural Korean, consistency
- Refine existing documents without changing structure or code blocks
- Report summary of changes made
