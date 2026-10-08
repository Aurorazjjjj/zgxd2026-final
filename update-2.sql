-- 增量更新：在 Supabase SQL Editor 运行一次（揭晓大屏支持点击任意奖位单独揭晓）
create or replace function final_admin_set_reveal(p_code text, p_step int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform final_chk(p_code);
  update final_state set reveal_step = greatest(0, least(127, p_step)) where id = 1;
  perform final_bump();
end $$;
update final_state set reveal_step = 0 where id = 1;
