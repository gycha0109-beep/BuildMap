set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';
insert into public.execution_milestones
  (id,project_id,track_id,roadmap_revision_id,title,position,weight) values
  ('00000000-0000-4000-8000-000000000802',
   '00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601',
   '00000000-0000-4000-8000-000000000702','Concurrent milestone',0,1);
insert into public.completion_criteria
  (project_id,track_id,roadmap_revision_id,milestone_id,title,position,rule_type,is_required) values
  ('00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601',
   '00000000-0000-4000-8000-000000000702',
   '00000000-0000-4000-8000-000000000802',
   'Required gate',0,'MANUAL_ACCEPTANCE',true);
reset role;
