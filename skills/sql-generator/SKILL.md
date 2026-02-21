---
name: sql-generator
description: SQL generator with vendor-aware DDL/DML generation following strict formatting, naming, and policy rules
model: sonnet
argument-hint: "[query-type] [table/context]"
---

# SQL Generator

Generate SQL (DDL, DML) with strict formatting and policy rules. Always confirm the database vendor first.

## Use When
- User requests SQL generation: DDL, DML, schema design
- Keywords: "create table", "sql", "query", "ddl", "dml", "테이블", "쿼리"

## Do Not Use When
- Running/executing SQL, SQL theory questions, ORM/entity code generation

## Steps

1. **Confirm database vendor** (REQUIRED)
   - `AskUserQuestion`: "Which database vendor are you using?"
   - Options: Oracle, MySQL, PostgreSQL, MariaDB

2. **Generate SQL** applying all rules:

   **Formatting**: lowercase, leading commas, right-aligned clauses, `having` at col 0, `join` under `from`

   **DML**: explicit `JOIN`, no `SELECT *`, CTE over subqueries, `exists` over `in`

   **DDL**: `bigint id` PK, audit columns (`created_by`, `created_at`, `modified_by`, `modified_at`), no `enum` (use `varchar`), `char(1)` booleans (`is_`/`has_`/`can_` + `_yn`), no FK/index by default, constraint naming `pk_`/`uk_`/`fk_`/`idx_`/`ck_` + `{table}_01`

3. **Present SQL** with design decisions

## Templates

```sql
-- DDL
create table orders (
    id              bigint
  , user_id         bigint not null
  , order_date      date not null
  , total_amount    decimal(10, 2)
  , status          varchar(20) default 'pending'
  , is_cancelled_yn char(1) not null default 'N'
  , created_by      varchar(50) not null
  , created_at      timestamp not null default current_timestamp
  , modified_by     varchar(50) not null
  , modified_at     timestamp not null default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, order_date)
  , constraint ck_orders_01 check (is_cancelled_yn in ('Y', 'N'))
);
-- create index idx_orders_01 on orders(user_id);

-- DML
select u.id
     , u.name
     , o.order_date
  from users u
       inner join orders o
                  on u.id = o.user_id
 where u.status = 'active'
   and o.order_date >= '2024-01-01'
 order by o.order_date desc
```

## References

- [references/formatting.md](references/formatting.md) -- alignment, commas, indentation
- [references/naming.md](references/naming.md) -- tables, columns, constraints
- [references/ddl-policies.md](references/ddl-policies.md) -- PK, audit, types, FK/index
- [references/query-patterns.md](references/query-patterns.md) -- SELECT, INSERT, UPDATE, DELETE, CTE
- [references/performance.md](references/performance.md) -- EXISTS vs IN, index tips

## Checklist
- [ ] Vendor confirmed via AskUserQuestion
- [ ] Lowercase, leading commas, right-aligned clauses
- [ ] Explicit JOIN, no `SELECT *`
- [ ] `bigint id` PK + four audit columns
- [ ] `varchar` for status (no `enum`), `char(1)` for booleans (`is_`/`has_`/`can_` + `_yn`)
- [ ] No FK/index unless requested (suggest as comments)
- [ ] Vendor-specific syntax applied
