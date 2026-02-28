# SQL Generator

엄격한 포맷팅과 정책 규칙에 따라 SQL(DDL, DML)을 생성합니다. 항상 데이터베이스 벤더를 먼저 확인합니다.

## 사용 시점
- 사용자가 SQL 생성을 요청할 때: DDL, DML, 스키마 설계
- 키워드: "create table", "sql", "query", "ddl", "dml", "테이블", "쿼리"

## 사용하지 않을 때
- SQL 실행/실행, SQL 이론 질문, ORM/엔티티 코드 생성

## 단계

1. **데이터베이스 벤더 확인** (필수)
   - `AskUserQuestion`: "Which database vendor are you using?"
   - 옵션: Oracle, MySQL, PostgreSQL, MariaDB

2. **모든 규칙을 적용하여 SQL 생성**:

   **포맷팅**: 소문자, 선행 콤마, 우측 정렬 절, `having`은 col 0, `join`은 `from` 아래

   **DML**: 명시적 `JOIN`, `SELECT *` 금지, 서브쿼리보다 CTE, `in`보다 `exists`

   **DDL**: `bigint id` PK, 감사 컬럼 (`created_by`, `created_at`, `modified_by`, `modified_at`), `enum` 금지 (`varchar` 사용), `bit` 불리언 (명확성을 높일 때 선택적으로 `is_`/`has_`/`can_` 접두사), 기본적으로 FK/인덱스 없음, 제약조건 네이밍 `pk_`/`uk_`/`fk_`/`idx_`/`ck_` + `{table}_01`

3. **설계 결정과 함께 SQL 제시**

## 템플릿

```sql
-- DDL
create table orders (
    id              bigint
  , user_id         bigint not null
  , order_date      date not null
  , total_amount    decimal(10, 2)
  , status          varchar(20) default 'pending'
  , canceled       bit not null default 0
  , created_by      varchar(50) not null
  , created_at      timestamp not null default current_timestamp
  , modified_by     varchar(50) not null
  , modified_at     timestamp not null default current_timestamp
  , constraint pk_orders primary key (id)
  , constraint uk_orders_01 unique (user_id, order_date)
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

## 참조

- [references/formatting.md](references/formatting.md) -- 정렬, 콤마, 들여쓰기
- [references/naming.md](references/naming.md) -- 테이블, 컬럼, 제약조건
- [references/ddl-policies.md](references/ddl-policies.md) -- PK, 감사, 타입, FK/인덱스
- [references/query-patterns.md](references/query-patterns.md) -- SELECT, INSERT, UPDATE, DELETE, CTE
- [references/performance.md](references/performance.md) -- EXISTS vs IN, 인덱스 팁

## 체크리스트
- [ ] AskUserQuestion을 통해 벤더 확인
- [ ] 소문자, 선행 콤마, 우측 정렬 절
- [ ] 명시적 JOIN, `SELECT *` 없음
- [ ] `bigint id` PK + 4개 감사 컬럼
- [ ] status에 `varchar` (enum 없음), 불리언에 `bit` (선택적 `is_`/`has_`/`can_` 접두사)
- [ ] 요청하지 않는 한 FK/인덱스 없음 (주석으로 제안)
- [ ] 벤더별 구문 적용
