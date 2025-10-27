-- Delete all data for user aalopez4300@gmail.com (e5f9a344-49d4-4f68-8be6-fa5528052822)

-- Delete files (instead of updating)
DELETE FROM files WHERE uploaded_by = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete project memberships  
DELETE FROM project_members WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete workspace memberships
DELETE FROM workspace_members WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete user preferences
DELETE FROM user_preferences WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete user roles
DELETE FROM user_roles WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete notifications
DELETE FROM notifications WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete time entries
DELETE FROM time_entries WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete AI chat threads and messages
DELETE FROM ai_chat_messages WHERE thread_id IN (SELECT id FROM ai_chat_threads WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822');
DELETE FROM ai_chat_threads WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete project chat messages
DELETE FROM project_chat_messages WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete from activity log
DELETE FROM activity_log WHERE user_id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Delete from public.users
DELETE FROM public.users WHERE id = 'e5f9a344-49d4-4f68-8be6-fa5528052822';

-- Finally, delete from auth.users
DELETE FROM auth.users WHERE email = 'aalopez4300@gmail.com';