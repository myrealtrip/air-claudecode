# Query Patterns

## SELECT

- No `select *` -- always specify column names
- Use table aliases for multi-table queries
- Use explicit `JOIN` syntax

```sql
select u.id
     , u.name
     , u.email
  from users u
 where u.status = 'active'
```

## SELECT with JOIN

```sql
select u.id
     , u.name
     , o.order_date
     , o.total_amount
  from users u
       inner join orders o
                  on u.id = o.user_id
 where u.status = 'active'
```

Anti-pattern -- implicit join:

```sql
-- Bad: Implicit join
select u.name
     , o.order_date
  from users u
     , orders o
 where u.id = o.user_id

-- Good: Explicit join
select u.name
     , o.order_date
  from users u
       inner join orders o
                  on u.id = o.user_id
```

## CTE (Common Table Expression)

Prefer CTEs over nested subqueries for complex queries:

```sql
with active_users as (
    select id
         , name
      from users
     where status = 'active'
)
, recent_orders as (
    select user_id
         , count(*) as order_count
      from orders
     where order_date >= current_date - interval '30' day
     group by user_id
)
select au.name
     , ro.order_count
  from active_users au
       join recent_orders ro
            on au.id = ro.user_id
```

## INSERT

```sql
insert into users (
    name
  , email
  , status
  , created_by
  , created_at
  , modified_by
  , modified_at
) values (
    'John Doe'
  , 'john@example.com'
  , 'active'
  , 'system'
  , current_timestamp
  , 'system'
  , current_timestamp
);
```

## UPDATE

```sql
update users
   set name = 'Jane Doe'
     , email = 'jane@example.com'
     , modified_by = 'admin'
     , modified_at = current_timestamp
 where id = 1;
```

## DELETE

```sql
delete from orders
 where status = 'canceled'
   and created_at < current_date - interval '1' year;
```

## CREATE TABLE (complete)

```sql
create table orders (
    id           bigint
  , user_id      bigint not null
  , order_date   date not null
  , total_amount decimal(10, 2)
  , status       varchar(20) default 'pending'
  , created_by   varchar(50) not null
  , created_at   timestamp not null default current_timestamp
  , modified_by  varchar(50) not null
  , modified_at  timestamp not null default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, order_date)
);

-- Suggested indexes:
-- create index idx_orders_01 on orders(user_id);
-- create index idx_orders_02 on orders(order_date);
-- create index idx_orders_03 on orders(status);
```

## Comments in SQL

Use comments to explain complex logic and document business rules:

```sql
-- Get users who have placed orders in the last 30 days
-- but have not logged in during the same period (potential churn risk)
with recent_orders as (
    select distinct user_id
      from orders
     where order_date >= current_date - interval '30' day
)
select u.id
     , u.name
     , u.email
  from users u
       join recent_orders ro
            on u.id = ro.user_id
 where u.last_login_at < current_date - interval '30' day
```
