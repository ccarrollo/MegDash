alter table daily_plan_anchors
add column if not exists restaurant text;

alter table daily_plan_anchors
add column if not exists food_notes text;

alter table daily_plan_anchors
add column if not exists interaction_notes text;

alter table daily_plan_anchors
add column if not exists headcount int;

alter table daily_plan_anchors
add column if not exists total_cost numeric(10, 2);

alter table daily_plan_anchors
add column if not exists cost_per_head numeric(10, 2);
