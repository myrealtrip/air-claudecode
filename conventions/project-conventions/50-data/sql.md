# SQL 스타일 가이드

> **핵심 원칙**: ANSI SQL을 사용하고, 소문자 키워드, 앞쪽 쉼표(leading commas), 우측 정렬 절(clause)을 적용한다. 간결함보다 명확함을 우선한다.

## 일반 원칙

- 기본으로 **ANSI SQL**을 사용한다 — 벤더 특화 구문은 필요한 경우에만
- 모든 SQL 키워드와 식별자에 **소문자**를 사용한다
- 읽기 쉽고 유지보수하기 좋은 쿼리를 작성한다
- 간결함보다 명확함을 우선한다

## 포맷팅 규칙

### 키워드 정렬

- 주요 절(`select`, `from`, `where`, `group by`, `order by`, `limit`)은 우측 정렬
- `having`은 컬럼 0에 좌측 정렬
- `join`은 `from` 아래에 들여쓰기, `on`은 `join` 아래에 들여쓰기
- 쉼표는 줄 **앞쪽**에 배치한다 (앞쪽 쉼표)

```sql
select u.id
     , u.name
     , u.email
     , o.order_date
     , o.total_amount
  from users u
       inner join orders o
                  on u.id = o.user_id
 where u.status = 'active'
   and o.order_date >= '2024-01-01'
 group by u.id
        , u.name
        , u.email
        , o.order_date
        , o.total_amount
having count(*) > 1
 order by o.order_date desc
 limit 10
```

앞쪽 쉼표의 장점: 컬럼 주석 처리가 쉽고, 시각적 정렬이 명확하며, 버전 관리 diff가 단순해진다.

## 네이밍 규칙

- **테이블**: `snake_case`, 복수 명사 (예: `users`, `order_items`, `product_categories`)
- **컬럼**: `snake_case`, 널리 알려진 것 외에는 약어 사용 금지 (예: `user_id`, `created_at`, `is_active`)
- **기본 키**: `id` 또는 `{table_name}_id`, **외래 키**: `{referenced_table}_id`
- 코드/상태 컬럼에 **데이터베이스 `ENUM` 타입 사용 금지** — 항상 `varchar` 사용
- **외래 키 제약을 기본으로 추가하지 않는다** — 명시적 요청이 있을 때만

### 코드/상태 컬럼

> **중요**: DDL에서 코드나 상태 컬럼에 데이터베이스 `ENUM` 타입을 사용하지 않는다. 항상 `varchar`를 사용한다. 데이터베이스 `ENUM` 타입은 값을 추가하거나 제거할 때 스키마 마이그레이션(ALTER TABLE)이 필요하지만, `varchar` 컬럼은 DDL 수정 없이 애플리케이션 레벨에서 변경할 수 있다.

```sql
-- 좋은 예: 코드/상태 컬럼에 varchar 사용
create table orders (
    id           bigint
  , status       varchar(20) not null   -- 애플리케이션 enum으로 관리
  , payment_type varchar(20) not null   -- 애플리케이션 enum으로 관리
  , constraint pk_orders primary key (id)
);

-- 나쁜 예: 데이터베이스 ENUM 타입 — 새 값 추가 시 ALTER TABLE 필요
create table orders (
    id           bigint
  , status       enum('PENDING', 'PAID', 'SHIPPED') not null
  , constraint pk_orders primary key (id)
);
```

### 제약 네이밍 규칙

| 유형 | 패턴 | 예시 |
|------|------|------|
| 기본 키 | `pk_{table_name}` | `pk_orders` |
| 유니크 키 | `uk_{table_name}_01`, `_02`, ... | `uk_users_01` |
| 외래 키 | `fk_{table_name}_01`, `_02`, ... | `fk_orders_01` |
| 인덱스 | `idx_{table_name}_01`, `_02`, ... | `idx_orders_01` |
| 시퀀스 | `seq_{table_name}_01`, `_02`, ... | `seq_orders_01` |
| 체크 | `ck_{table_name}_01`, `_02`, ... | `ck_orders_01` |

```sql
-- 기본: FK 제약 없음, 인덱스 없음
create table orders (
    id           bigint
  , user_id      bigint not null
  , total_amount decimal(10, 2)
  , created_at   timestamp default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, created_at)
);

-- 제안 인덱스:
-- create index idx_orders_01 on orders(user_id);
-- create index idx_orders_02 on orders(created_at);

-- 명시적 요청이 있을 때만: FK 제약 포함
create table orders (
    id           bigint
  , user_id      bigint not null
  , total_amount decimal(10, 2)
  , created_at   timestamp default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint fk_orders_01
      foreign key (user_id) references users(id)
);
```

## 쿼리 모범 사례

- `select *` 사용 금지 — 항상 컬럼명을 명시적으로 지정한다
- 다중 테이블 쿼리에 테이블 별칭을 사용한다
- 항상 명시적 `JOIN` 구문을 사용한다 (암시적 쉼표 조인 금지)
- 서브쿼리에서 `in`보다 `exists`를 선호한다
- 복잡한 쿼리에서 중첩 서브쿼리보다 CTE를 선호한다

```sql
-- CTE (복잡한 쿼리에 선호)
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

### INSERT / UPDATE / DELETE

```sql
-- INSERT
insert into users (
    name
  , email
  , status
  , created_at
) values (
    'John Doe'
  , 'john@example.com'
  , 'active'
  , current_timestamp
);

-- UPDATE
update users
   set name = 'Jane Doe'
     , email = 'jane@example.com'
     , updated_at = current_timestamp
 where id = 1;

-- DELETE
delete from orders
 where status = 'cancelled'
   and created_at < current_date - interval '1' year;
```

## 성능 모범 사례

### 인덱싱

- **인덱스를 기본으로 생성하지 않는다** — 필요하면 제안만 한다
- DDL 작성 시 인덱스를 주석으로 제안한다:

```sql
create table orders (
    id           bigint
  , user_id      bigint not null
  , order_date   date
  , constraint pk_orders primary key (id)
);

-- 제안 인덱스:
-- create index idx_orders_01 on orders(user_id);
-- create index idx_orders_02 on orders(order_date);
```

### EXISTS와 IN

```sql
-- 좋은 예: EXISTS
select u.name
  from users u
 where exists (
    select 1
      from orders o
     where o.user_id = u.id
       and o.status = 'completed'
)

-- 나쁜 예: 서브쿼리에 IN
select u.name
  from users u
 where u.id in (
    select o.user_id
      from orders o
     where o.status = 'completed'
)
```

### 인덱스 컬럼에 함수 적용 금지

인덱스가 걸린 컬럼에 `WHERE` 절에서 함수를 적용하면 인덱스를 사용할 수 없다:

```sql
-- 나쁜 예: 인덱스 컬럼에 함수 적용으로 인덱스 사용 불가
select id, name
  from users
 where year(created_at) = 2024

-- 좋은 예: 범위 조건으로 인덱스 사용 가능
select id, name
  from users
 where created_at >= '2024-01-01'
   and created_at < '2025-01-01'
```
