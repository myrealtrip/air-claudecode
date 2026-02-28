# DDL Policies

## Primary Key Policy

> **Always use `bigint` type `id` as primary key.**

```sql
create table users (
    id           bigint
  , name         varchar(50) not null
  , email        varchar(255) not null
  , constraint pk_users primary key (id)
);
```

Benefits:
- Consistent across all tables
- Sufficient range for large datasets
- Simple JOIN conditions
- Framework-friendly (ORM, etc.)

## Audit Columns Policy

> **Always include these four audit columns** when creating tables.

| Column | Type | Description |
|--------|------|-------------|
| `created_by` | `varchar(50) not null` | User who created the record |
| `created_at` | `timestamp not null default current_timestamp` | When the record was created |
| `modified_by` | `varchar(50) not null` | User who last modified the record |
| `modified_at` | `timestamp not null default current_timestamp` | When the record was last modified |

```sql
create table orders (
    id           bigint
  , user_id      bigint not null
  , order_date   date not null
  , total_amount decimal(10, 2)
  , status       varchar(20) default 'pending'
  -- Audit columns (always required)
  , created_by   varchar(50) not null
  , created_at   timestamp not null default current_timestamp
  , modified_by  varchar(50) not null
  , modified_at  timestamp not null default current_timestamp
  , constraint pk_orders primary key (id)
);
```

## Column Type Policy

### Use Database Date Types

| Purpose | Use | Don't Use |
|---------|-----|-----------|
| Date only | `date` | `varchar`, `int` |
| Time only | `time` | `varchar` |
| Date and time | `timestamp`, `datetime` | `varchar`, `bigint` |
| With timezone | `timestamptz` (PostgreSQL) | `timestamp` + separate tz |

```sql
-- Good: Proper date/time types
create table events (
    id           bigint
  , event_date   date
  , start_time   time
  , scheduled_at timestamp
  , constraint pk_events primary key (id)
);

-- Bad: String or numeric for dates
create table events (
    id           bigint
  , event_date   varchar(10)
  , start_time   varchar(8)
  , scheduled_at bigint
);
```

### Boolean Columns: `bit` Type

> **Use `bit` type for boolean columns.** Optionally use `is_`/`has_`/`can_` prefix when it improves clarity.

```sql
-- Good: bit type, prefix optional
create table users (
    id              bigint
  , name            varchar(50) not null
  , is_active       bit not null default 1   -- prefix improves clarity
  , deleted         bit not null default 0   -- clear without prefix
  , has_agreed      bit not null default 0   -- prefix improves clarity
  , canceled       bit not null default 0   -- clear without prefix
  , constraint pk_users primary key (id)
);

-- Bad: char(1) Y/N, boolean, tinyint
create table users (
    id           bigint
  , is_active    boolean
  , is_deleted   tinyint(1)
  , active_yn    char(1)         -- wrong type
);
```

Rules:
- Type: `bit not null` with default `1` (true) or `0` (false)
- Values: `1` (true) or `0` (false)
- Naming: optionally use `is_`/`has_`/`can_` prefix when it better represents meaning (e.g., `is_active`, `has_permission`); omit when the column name alone is clear (e.g., `canceled`, `deleted`)
- Do NOT use `char(1)` with `'Y'`/`'N'`, `boolean`, `tinyint`, `number(1)` types
- No check constraint needed (`bit` only accepts `0` and `1`)

### Do NOT Use Enum Types

> **Never use `enum`.** Use `varchar` instead.

```sql
-- Bad
create table users (
    id     bigint
  , status enum('active', 'inactive', 'suspended')
);

-- Good
create table users (
    id     bigint
  , status varchar(20) not null
);
```

Why avoid enum:
- Adding/removing values requires `ALTER TABLE`
- Syntax differs between MySQL, PostgreSQL, Oracle
- Enum changes can be difficult to rollback
- Some ORMs handle enums poorly
- Better to validate at application layer

Alternative patterns:

```sql
-- Option 1: varchar with check constraint (when strict validation needed)
create table users (
    id     bigint
  , status varchar(20) not null
  , constraint ck_users_01 check (status in ('active', 'inactive', 'suspended'))
);

-- Option 2: Reference table (for complex status with metadata)
create table user_statuses (
    id          bigint
  , code        varchar(20) not null
  , name        varchar(50) not null
  , description varchar(500)
  , constraint pk_user_statuses primary key (id)
  , constraint uk_user_statuses_01 unique (code)
);

create table users (
    id          bigint
  , status_code varchar(20) not null
  , constraint pk_users primary key (id)
);
```

## Foreign Key and Index Policy

> **Default: No FK constraints, no indexes.** Only add when user explicitly requests.

```sql
-- Default: No FK constraint, no index
create table orders (
    id           bigint
  , user_id      bigint not null
  , total_amount decimal(10, 2)
  , created_at   timestamp default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, created_at)
);

-- Suggested indexes (as comments):
-- create index idx_orders_01 on orders(user_id);
-- create index idx_orders_02 on orders(created_at);
```

When user requests FK constraints:

```sql
create table orders (
    id           bigint
  , user_id      bigint not null
  , total_amount decimal(10, 2)
  , constraint pk_orders primary key (id)
  , constraint fk_orders_01
      foreign key (user_id) references users(id)
);
```
