-- ============================================================
-- 逐光行动 · 点亮星河 — 决赛评分系统 数据库
-- 在 Supabase 控制台 → SQL Editor 中整段粘贴运行一次即可
-- 与初赛表互不影响（全部以 final_ 开头）
-- ============================================================

create table if not exists final_admin (id int primary key default 1, code text not null);
insert into final_admin (id, code) values (1, 'Pfizer2026MT')
  on conflict (id) do update set code = excluded.code;

create table if not exists final_cases (
  id serial primary key, sort int not null default 0,
  region text not null, name text not null, title text not null
);
create table if not exists final_judges (
  id serial primary key, sort int not null default 0,
  name text not null, title text not null default '', active boolean not null default true
);
create table if not exists final_scores (
  judge_id int not null references final_judges(id) on delete cascade,
  case_id int not null references final_cases(id) on delete cascade,
  details jsonb not null, total int not null, updated_at timestamptz not null default now(),
  primary key (judge_id, case_id)
);
create table if not exists final_votes (
  case_id int primary key references final_cases(id) on delete cascade, votes int not null
);
create table if not exists final_state (
  id int primary key default 1,
  current_case_id int references final_cases(id) on delete set null,
  opened int[] not null default '{}', reveal_step int not null default 0
);
create table if not exists final_signal (id int primary key default 1, ver bigint not null default 0, updated_at timestamptz default now());

insert into final_state (id) values (1) on conflict do nothing;
insert into final_signal (id) values (1) on conflict do nothing;

-- 预置 12 个案例 / 14 位评委（仅在表为空时写入）
insert into final_cases (sort, region, name, title)
select * from (values
 (1,'东蒙晋','张磊','聚力攻坚逐域突围'),
 (2,'京津冀','李明伟','与医院DDDs的三年往来'),
 (3,'沪闽','黄靖茹','以协同破壁垒，以比例筑长效'),
 (4,'沪闽','郑郁平','在扩大分子式中寻得双千共赢'),
 (5,'粤海','丘铭','中山市人民医院序时进度实时追赶战'),
 (6,'粤海','刘国琦','深耕临床，聚力破局'),
 (7,'苏皖','甘宁','拓边攻哌，舒势稳盘'),
 (8,'苏皖','金晶','药敏闭环助力拓分子式'),
 (9,'荆豫','李梅娟','尿路安舒，拓局双品'),
 (10,'荆豫','陆玲洁','攻坚壁垒，聚力笃行'),
 (11,'荆豫','陈瑞','当舒普深停控，20天逆行寻微光'),
 (12,'沪闽','梁茵','舒普深托分子式三板斧之临床路径赋能工具包')
) v where not exists (select 1 from final_cases);

insert into final_judges (sort, name)
select * from (values
 (1,'许德才'),(2,'宝华'),(3,'邢辉'),(4,'杨俭'),(5,'张更佳'),(6,'马里阳'),(7,'方欣'),
 (8,'刘国鹏'),(9,'王雯'),(10,'袁洁'),(11,'王媛'),(12,'亓勇'),(13,'罗立蔚'),(14,'李爽')
) v where not exists (select 1 from final_judges);

-- 权限：表只能通过下面的函数访问；final_signal 允许匿名读取（仅用于实时推送，不含任何分数）
alter table final_admin enable row level security;
alter table final_cases enable row level security;
alter table final_judges enable row level security;
alter table final_scores enable row level security;
alter table final_votes enable row level security;
alter table final_state enable row level security;
alter table final_signal enable row level security;
drop policy if exists final_signal_read on final_signal;
create policy final_signal_read on final_signal for select to anon, authenticated using (true);
grant select on final_signal to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table final_signal;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------- 工具 ----------
create or replace function final_chk(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from final_admin where code = p_code) then raise exception '管理密码错误'; end if;
end $$;

create or replace function final_bump() returns void
language sql security definer set search_path = public as $$
  update final_signal set ver = ver + 1, updated_at = now() where id = 1;
$$;

-- ---------- 评委端 ----------
create or replace function final_judge_list() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by sort, id), '[]'::jsonb)
  from final_judges where active;
$$;

create or replace function final_judge_state(p_judge_id int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j final_judges; st final_state;
begin
  select * into j from final_judges where id = p_judge_id and active;
  if not found then raise exception '评委不存在或已停用'; end if;
  select * into st from final_state where id = 1;
  return jsonb_build_object(
    'judge', jsonb_build_object('id', j.id, 'name', j.name),
    'current_case_id', st.current_case_id,
    'opened', to_jsonb(st.opened),
    'cases', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'region', c.region, 'name', c.name, 'title', c.title) order by c.sort, c.id), '[]'::jsonb) from final_cases c),
    'scores', (select coalesce(jsonb_object_agg(s.case_id::text, jsonb_build_object('details', s.details, 'total', s.total)), '{}'::jsonb) from final_scores s where s.judge_id = j.id)
  );
end $$;

create or replace function final_save_score(p_judge_id int, p_case_id int, p_details jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare st final_state; k text; v int; mx int; tot int := 0; clean jsonb := '{}'::jsonb;
  maxes jsonb := '{"c1":5,"c2":10,"c3":10,"c4":15,"c5":10,"c6":10}'::jsonb;
  req text[] := array['c1','c2','c3','c4','c5'];
begin
  if not exists (select 1 from final_judges where id = p_judge_id and active) then raise exception '评委不存在或已停用'; end if;
  if not exists (select 1 from final_cases where id = p_case_id) then raise exception '案例不存在'; end if;
  select * into st from final_state where id = 1;
  if not exists (select 1 from final_scores where judge_id = p_judge_id and case_id = p_case_id)
     and not (p_case_id = any(st.opened)) then
    raise exception '该案例尚未开放评分';
  end if;
  for k in select jsonb_object_keys(maxes) loop
    if p_details ? k and jsonb_typeof(p_details -> k) = 'number' then
      v := (p_details ->> k)::int; mx := (maxes ->> k)::int;
      if v < 0 or v > mx then raise exception '分数超出范围'; end if;
      clean := clean || jsonb_build_object(k, v); tot := tot + v;
    elsif k = any(req) then
      raise exception '请完成所有必填评分项';
    end if;
  end loop;
  insert into final_scores (judge_id, case_id, details, total, updated_at)
  values (p_judge_id, p_case_id, clean, tot, now())
  on conflict (judge_id, case_id) do update set details = excluded.details, total = excluded.total, updated_at = now();
  perform final_bump();
  return jsonb_build_object('total', tot);
end $$;

-- ---------- 管理端 ----------
create or replace function final_admin_login(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin perform final_chk(p_code); return true; end $$;

create or replace function final_admin_state(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare st final_state;
begin
  perform final_chk(p_code);
  select * into st from final_state where id = 1;
  return jsonb_build_object(
    'current_case_id', st.current_case_id, 'opened', to_jsonb(st.opened), 'reveal_step', st.reveal_step,
    'cases', (select coalesce(jsonb_agg(to_jsonb(c) order by c.sort, c.id), '[]'::jsonb) from final_cases c),
    'judges', (select coalesce(jsonb_agg(to_jsonb(j) order by j.sort, j.id), '[]'::jsonb) from final_judges j),
    'scores', (select coalesce(jsonb_agg(jsonb_build_object('judge_id', s.judge_id, 'case_id', s.case_id, 'total', s.total,
                 'at', to_char(s.updated_at at time zone 'Asia/Shanghai', 'HH24:MI'))), '[]'::jsonb) from final_scores s),
    'votes', (select coalesce(jsonb_object_agg(v.case_id::text, v.votes), '{}'::jsonb) from final_votes v)
  );
end $$;

create or replace function final_admin_set_current(p_code text, p_case_id int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  update final_state set current_case_id = p_case_id where id = 1;
  perform final_bump();
end $$;

create or replace function final_admin_open_case(p_code text, p_case_id int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  update final_state set current_case_id = p_case_id,
    opened = case when p_case_id = any(opened) then opened else array_append(opened, p_case_id) end
  where id = 1;
  perform final_bump();
end $$;

create or replace function final_admin_save_case(p_code text, p_case jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare nid int; r text := trim(coalesce(p_case->>'region','')); n text := trim(coalesce(p_case->>'name','')); t text := trim(coalesce(p_case->>'title',''));
begin
  perform final_chk(p_code);
  if r = '' or n = '' or t = '' then raise exception '请填写完整'; end if;
  if p_case->>'id' is null then
    insert into final_cases (sort, region, name, title)
    values ((select coalesce(max(sort), 0) + 1 from final_cases), r, n, t) returning id into nid;
  else
    nid := (p_case->>'id')::int;
    update final_cases set region = r, name = n, title = t where id = nid;
  end if;
  perform final_bump();
  return nid;
end $$;

create or replace function final_admin_delete_case(p_code text, p_case_id int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  delete from final_cases where id = p_case_id;
  update final_state set opened = array_remove(opened, p_case_id) where id = 1;
  perform final_bump();
end $$;

create or replace function final_admin_reorder_cases(p_code text, p_ids int[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  update final_cases c set sort = x.ord from unnest(p_ids) with ordinality as x(id, ord) where c.id = x.id;
  perform final_bump();
end $$;

create or replace function final_admin_save_judge(p_code text, p_judge jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare nid int; n text := trim(coalesce(p_judge->>'name','')); t text := trim(coalesce(p_judge->>'title',''));
begin
  perform final_chk(p_code);
  if n = '' then raise exception '请填写评委姓名'; end if;
  if p_judge->>'id' is null then
    insert into final_judges (sort, name, title) values ((select coalesce(max(sort), 0) + 1 from final_judges), n, t) returning id into nid;
  else
    nid := (p_judge->>'id')::int;
    update final_judges set name = n, title = t where id = nid;
  end if;
  perform final_bump();
  return nid;
end $$;

create or replace function final_admin_delete_judge(p_code text, p_judge_id int) returns void
language plpgsql security definer set search_path = public as $$
begin perform final_chk(p_code); delete from final_judges where id = p_judge_id; perform final_bump(); end $$;

create or replace function final_admin_set_judge_active(p_code text, p_judge_id int, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin perform final_chk(p_code); update final_judges set active = p_active where id = p_judge_id; perform final_bump(); end $$;

create or replace function final_admin_set_vote(p_code text, p_case_id int, p_votes int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  if p_votes is null then delete from final_votes where case_id = p_case_id;
  else
    if p_votes < 0 then raise exception '票数不能为负'; end if;
    insert into final_votes (case_id, votes) values (p_case_id, p_votes)
    on conflict (case_id) do update set votes = excluded.votes;
  end if;
  perform final_bump();
end $$;

create or replace function final_admin_set_reveal(p_code text, p_step int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  update final_state set reveal_step = greatest(0, least(7, p_step)) where id = 1;
  perform final_bump();
end $$;

-- 彩排后清空：删除全部评分、票数，重置开放状态和揭晓进度（案例、评委保留）
create or replace function final_admin_reset(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  delete from final_scores where true;
  delete from final_votes where true;
  update final_state set current_case_id = null, opened = '{}', reveal_step = 0 where id = 1;
  perform final_bump();
end $$;

-- 修改管理密码：update final_admin set code = '新密码' where id = 1;
