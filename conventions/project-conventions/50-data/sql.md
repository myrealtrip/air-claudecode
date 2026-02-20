# SQL Style Guide

## General Principles

- Use **ANSI SQL** -- avoid vendor-specific syntax unless necessary
- Use **lowercase** for all SQL keywords and identifiers
- Optimize for clarity over brevity

## Formatting

- **Leading commas** at the beginning of lines
- **Right-align** main clauses (`select`, `from`, `where`, `group by`, `order by`, `limit`)
- `having` left-aligned at column 0
- `join` indented under `from`, `on` indented under `join`
- Place each `and`/`or` condition on a new line

## Naming Conventions

- Tables: **snake_case**, **plural** nouns
- Columns: **snake_case**, no abbreviations
- **Do NOT use ENUM** for code/status columns -- use `varchar`
- Constraint naming: `pk_`, `uk_`, `fk_`, `idx_`, `seq_`, `ck_` + `{table_name}` + `_01`, `_02`, ...

## Keys & Constraints

- Primary key: `id` or `{table_name}_id`
- Foreign key column: `{referenced_table}_id`
- **Do NOT add FK constraints or indexes by default** -- only when explicitly requested
- Suggest indexes as comments in DDL

## Query Best Practices

- Avoid `select *` -- always specify columns explicitly
- Use explicit `JOIN` syntax, not implicit comma joins
- Prefer `CTE` over nested subqueries for complex queries
- Prefer `exists` over `in` for subqueries
- Avoid functions on indexed columns in `WHERE` clauses
- Use `limit` for large result sets

## Database-Specific

- **MySQL**: backticks for reserved words, `auto_increment`, `datetime`/`timestamp`
- **PostgreSQL**: `serial`/`bigserial`, `timestamptz`, arrays/jsonb
- **Oracle**: sequences, `nvl`/`coalesce`, 30-char name limit
