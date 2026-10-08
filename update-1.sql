-- 增量更新：在 Supabase SQL Editor 中运行一次（新增「清空某位评委的评分」）
create or replace function final_admin_clear_judge_scores(p_code text, p_judge_id int) returns void
language plpgsql security definer set search_path = public as $$
begin perform final_chk(p_code); delete from final_scores where judge_id = p_judge_id; perform final_bump(); end $$;
