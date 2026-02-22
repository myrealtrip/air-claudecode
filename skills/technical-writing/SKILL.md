---
name: technical-writing
description: Technical document writer following toss/technical-writing methodology (type → architecture → sentence)
context: fork
agent: technical-writer
model: opus
argument-hint: "[document topic or task description]"
---

# Technical Writing

Write technical documents following the [toss/technical-writing](https://github.com/toss/technical-writing) methodology.

## Usage

```
/air-claudecode:technical-writing Write a guide on setting up Redis caching
/air-claudecode:technical-writing API 인증 가이드 작성
```

## Workflow

1. **Type** -- Determine document type (Learning / Problem-solving / Reference / Explanation)
2. **Architecture** -- Design structure (headings, overview, information flow)
3. **Sentence** -- Write and refine (clear subjects, concise, natural Korean)

## Output

- Default: `.claudedocs/technical-writing/{document-name}.md` in working directory
- User can specify a custom output path

## Capabilities

- Classify document type based on reader's goal
- Structure documents with value-first, predictable layout
- Write clear sentences following Korean technical writing rules
- Generate complete markdown documents ready for review
