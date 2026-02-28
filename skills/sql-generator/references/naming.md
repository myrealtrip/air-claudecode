# Naming Conventions

## Tables

- Use **snake_case** for table names
- Use **plural** nouns
- Use meaningful, descriptive names

```sql
-- Good
users
order_items
product_categories

-- Bad
User
OrderItem
tbl_products
```

## Columns

- Use **snake_case** for column names
- Use consistent prefixes for related columns
- Avoid abbreviations unless widely understood

```sql
-- Good
user_id
created_at
is_active          -- boolean: bit, optional is_/has_/can_ prefix
has_permission     -- boolean: bit, optional is_/has_/can_ prefix
canceled          -- boolean: bit, no prefix when meaning is clear
total_amount

-- Bad
userId
createdAt
isActive
tot_amt
```

## Constraint Naming

| Type | Pattern | Example |
|------|---------|---------|
| Primary Key | `pk_{table_name}` | `pk_orders` |
| Unique Key | `uk_{table_name}_01`, `_02`, ... | `uk_users_01` |
| Foreign Key | `fk_{table_name}_01`, `_02`, ... | `fk_orders_01` |
| Index | `idx_{table_name}_01`, `_02`, ... | `idx_orders_01` |
| Sequence | `seq_{table_name}_01`, `_02`, ... | `seq_orders_01` |
| Check | `ck_{table_name}_01`, `_02`, ... | `ck_orders_01` |

## Complete Example

```sql
create table orders (
    id           bigint
  , user_id      bigint not null
  , total_amount decimal(10, 2)
  , created_at   timestamp default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, created_at)
);

-- Suggested indexes:
-- create index idx_orders_01 on orders(user_id);
-- create index idx_orders_02 on orders(created_at);

-- Only when explicitly requested: With FK constraint
create table order_items (
    id           bigint
  , order_id     bigint not null
  , product_id   bigint not null
  , quantity     int not null
  , constraint pk_order_items primary key (id)
  , constraint fk_order_items_01
      foreign key (order_id) references orders(id)
);
```
