-- Comprehensive seed data for testing AI capabilities
-- This file creates realistic test data for workspaces, users, projects, tasks, and more

-- ============================================
-- 1. WORKSPACES
-- ============================================
INSERT INTO public.workspaces (id, name, created_at, updated_at) VALUES
('53717b7e-78c0-4462-9360-cf257026db18', 'Acme Architecture Studio', NOW(), NOW()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Summit Design Group', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. USERS (with proper auth.users references)
-- ============================================
-- Note: These will reference existing auth.users entries
-- The actual user creation happens through Supabase Auth
-- This section assumes users with these IDs exist

-- Example workspace member relationships (adjust user_id values to match your auth.users)
-- You'll need to run this after creating actual auth users

-- ============================================
-- 3. PROJECTS
-- ============================================
INSERT INTO public.projects (
  id, workspace_id, name, short_id, description, status, phase,
  address, estimated_amount, created_at, updated_at
) VALUES
(
  'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
  '53717b7e-78c0-4462-9360-cf257026db18',
  'Riverside Residence Remodel',
  'RRR-001',
  'Complete renovation of a 3,200 sq ft riverside home including kitchen, master suite, and outdoor living spaces. Client wants modern farmhouse aesthetic with sustainable materials.',
  'active',
  'Design Development',
  '{"streetNumber": "1234", "streetName": "River View Drive", "city": "Portland", "state": "OR", "zipCode": "97201"}'::jsonb,
  45000.00,
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '2 days'
),
(
  'e1234567-89ab-cdef-0123-456789abcdef',
  '53717b7e-78c0-4462-9360-cf257026db18',
  'Downtown Office Renovation',
  'DOR-002',
  'Modernization of 5th floor office space. Open floor plan, improved lighting, and collaborative work areas.',
  'active',
  'Construction Documents',
  '{"streetNumber": "550", "streetName": "SW Oak Street", "city": "Portland", "state": "OR", "zipCode": "97204"}'::jsonb,
  85000.00,
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '1 day'
),
(
  'f2345678-9abc-def0-1234-56789abcdef0',
  '53717b7e-78c0-4462-9360-cf257026db18',
  'Mountain View Custom Home',
  'MVC-003',
  'New construction custom home with panoramic mountain views. 4,500 sq ft with timber frame construction.',
  'active',
  'Schematic Design',
  '{"streetNumber": "8890", "streetName": "Summit Ridge Road", "city": "Bend", "state": "OR", "zipCode": "97702"}'::jsonb,
  125000.00,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
),
(
  'a3456789-bcde-f012-3456-789abcdef012',
  '53717b7e-78c0-4462-9360-cf257026db18',
  'Historic Building Restoration',
  'HBR-004',
  'Restoration of 1920s brick building for mixed-use development. Preserving historic facade while modernizing interior.',
  'pending',
  'Pre-Design',
  '{"streetNumber": "123", "streetName": "Main Street", "city": "Salem", "state": "OR", "zipCode": "97301"}'::jsonb,
  95000.00,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '1 day'
),
(
  'b4567890-cdef-0123-4567-89abcdef0123',
  '53717b7e-78c0-4462-9360-cf257026db18',
  'Coastal Vacation Home',
  'CVH-005',
  'Beach house design with storm-resistant features and passive solar design. Spectacular ocean views.',
  'completed',
  'Construction Administration',
  '{"streetNumber": "2200", "streetName": "Pacific Coast Highway", "city": "Cannon Beach", "state": "OR", "zipCode": "97110"}'::jsonb,
  68000.00,
  NOW() - INTERVAL '180 days',
  NOW() - INTERVAL '30 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. TASKS
-- ============================================
INSERT INTO public.tasks (
  id, project_id, title, description, status, priority, due_date, created_at, updated_at
) VALUES
-- Riverside Residence tasks
('t1000001-1111-2222-3333-444444444444', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7', 
 'Review structural engineer drawings', 
 'Review and redline structural plans for kitchen addition', 
 'task_redline', 'high', NOW() + INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW()),

('t1000002-1111-2222-3333-444444444444', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Finalize kitchen cabinet selections',
 'Client meeting scheduled to review cabinet options and finishes',
 'in_progress', 'high', NOW() + INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW()),

('t1000003-1111-2222-3333-444444444444', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Complete electrical plan updates',
 'Update electrical plan based on client feedback from last meeting',
 'in_progress', 'medium', NOW() + INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW()),

('t1000004-1111-2222-3333-444444444444', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Order custom windows',
 'Submit order for custom aluminum clad windows - lead time 12 weeks',
 'done_completed', 'high', NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'),

('t1000005-1111-2222-3333-444444444444', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Review landscape architect plans',
 'Coordinate with landscape architect on outdoor living space design',
 'task_redline', 'medium', NOW() + INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW()),

-- Downtown Office tasks
('t2000001-1111-2222-3333-444444444444', 'e1234567-89ab-cdef-0123-456789abcdef',
 'Submit permit application',
 'Finalize permit drawings and submit to city',
 'in_progress', 'critical', NOW() + INTERVAL '2 days', NOW() - INTERVAL '4 days', NOW()),

('t2000002-1111-2222-3333-444444444444', 'e1234567-89ab-cdef-0123-456789abcdef',
 'Coordinate with MEP engineers',
 'Review mechanical, electrical, and plumbing coordination',
 'task_redline', 'high', NOW() + INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW()),

('t2000003-1111-2222-3333-444444444444', 'e1234567-89ab-cdef-0123-456789abcdef',
 'Update reflected ceiling plans',
 'Revise RCP based on new lighting layout',
 'in_progress', 'medium', NOW() + INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW()),

-- Mountain View tasks
('t3000001-1111-2222-3333-444444444444', 'f2345678-9abc-def0-1234-56789abcdef0',
 'Site analysis and solar study',
 'Complete site analysis including sun path and view corridors',
 'in_progress', 'high', NOW() + INTERVAL '8 days', NOW() - INTERVAL '5 days', NOW()),

('t3000002-1111-2222-3333-444444444444', 'f2345678-9abc-def0-1234-56789abcdef0',
 'Preliminary floor plans',
 'Develop three alternate floor plan options for client review',
 'task_redline', 'high', NOW() + INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW()),

('t3000003-1111-2222-3333-444444444444', 'f2345678-9abc-def0-1234-56789abcdef0',
 'Material board development',
 'Create material palette board with timber, stone, and metal samples',
 'in_progress', 'medium', NOW() + INTERVAL '10 days', NOW() - INTERVAL '4 days', NOW()),

-- Historic Building tasks
('t4000001-1111-2222-3333-444444444444', 'a3456789-bcde-f012-3456-789abcdef012',
 'Historic preservation review',
 'Submit application to historic preservation committee',
 'task_redline', 'critical', NOW() + INTERVAL '15 days', NOW() - INTERVAL '1 day', NOW()),

('t4000002-1111-2222-3333-444444444444', 'a3456789-bcde-f012-3456-789abcdef012',
 'Document existing conditions',
 'Photograph and measure existing building conditions',
 'in_progress', 'high', NOW() + INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW()),

-- Coastal Vacation tasks (completed project)
('t5000001-1111-2222-3333-444444444444', 'b4567890-cdef-0123-4567-89abcdef0123',
 'Final walkthrough',
 'Conduct final walkthrough with contractor and client',
 'done_completed', 'high', NOW() - INTERVAL '35 days', NOW() - INTERVAL '40 days', NOW() - INTERVAL '35 days'),

('t5000002-1111-2222-3333-444444444444', 'b4567890-cdef-0123-4567-89abcdef0123',
 'Close out punch list',
 'Review and close all outstanding punch list items',
 'done_completed', 'medium', NOW() - INTERVAL '32 days', NOW() - INTERVAL '38 days', NOW() - INTERVAL '32 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. FILES (metadata only)
-- ============================================
INSERT INTO public.files (
  id, workspace_id, project_id, name, type, size, folder, created_at, updated_at
) VALUES
('f1111111-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Riverside_Floor_Plans_v3.pdf', 'application/pdf', 2456789, 'Design', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),

('f2222222-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Kitchen_Elevations.pdf', 'application/pdf', 1834567, 'Design', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day'),

('f3333333-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Structural_Engineer_Review.pdf', 'application/pdf', 3245678, 'Consultants', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

('f4444444-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Material_Specifications.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 567890, 'Admin', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days'),

('f5555555-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'e1234567-89ab-cdef-0123-456789abcdef',
 'Office_Construction_Docs.pdf', 'application/pdf', 8934567, 'Design', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day'),

('f6666666-aaaa-bbbb-cccc-dddddddddddd', '53717b7e-78c0-4462-9360-cf257026db18', 'f2345678-9abc-def0-1234-56789abcdef0',
 'Site_Survey.pdf', 'application/pdf', 4567890, 'Site', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. LINKS
-- ============================================
INSERT INTO public.links (
  id, project_id, title, url, description, created_at, updated_at
) VALUES
('l1111111-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Sustainable Materials Guide', 'https://example.com/sustainable-materials',
 'Resource for eco-friendly building materials selection', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days'),

('l2222222-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'Modern Farmhouse Inspiration', 'https://example.com/farmhouse-designs',
 'Design inspiration board for client review', NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days'),

('l3333333-aaaa-bbbb-cccc-dddddddddddd', 'e1234567-89ab-cdef-0123-456789abcdef',
 'Portland Building Codes', 'https://example.com/portland-codes',
 'Reference for local building code requirements', NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. NOTES
-- ============================================
-- Note: The notes table structure uses 'files' table with type='note'
-- Adjust based on your actual schema

-- ============================================
-- 8. INVOICES
-- ============================================
INSERT INTO public.invoices (
  id, project_id, invoice_number, amount, status, issue_date, due_date, 
  description, created_at, updated_at
) VALUES
('i1111111-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'INV-2024-001', 15000.00, 'paid', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days',
 'Design Development Phase - 33% of total fee', NOW() - INTERVAL '65 days', NOW() - INTERVAL '25 days'),

('i2222222-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
 'INV-2024-002', 15000.00, 'pending', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
 'Construction Documents Phase - 33% of total fee', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),

('i3333333-aaaa-bbbb-cccc-dddddddddddd', 'e1234567-89ab-cdef-0123-456789abcdef',
 'INV-2024-003', 28333.00, 'paid', NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days',
 'Schematic Design & Design Development', NOW() - INTERVAL '50 days', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. ACTIVITY LOG
-- ============================================
-- Populate with realistic activity history
-- Note: user_id will need to match actual auth.users entries
-- Using placeholder UUID - replace with actual user IDs

-- Sample activity (adjust user_id as needed)
-- INSERT INTO public.activity_log (
--   workspace_id, project_id, user_id, action, resource_type, resource_id,
--   change_summary, old_value, new_value, created_at
-- ) VALUES
-- ('53717b7e-78c0-4462-9360-cf257026db18', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
--  'USER_UUID_HERE', 'created', 'task', 't1000001-1111-2222-3333-444444444444',
--  'Created task: Review structural engineer drawings', NULL, 
--  '{"title": "Review structural engineer drawings", "status": "task_redline"}'::jsonb,
--  NOW() - INTERVAL '2 days');

-- ============================================
-- 10. PROJECT MESSAGES (Chat)
-- ============================================
-- Sample chat messages for project collaboration
-- Note: user_id and sender_name need to match actual users

-- INSERT INTO public.project_messages (
--   id, project_id, user_id, content, sender_name, created_at, updated_at
-- ) VALUES
-- ('m1111111-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
--  'USER_UUID_HERE', 'Client approved the kitchen layout. Moving forward with cabinet selections.',
--  'Team Member', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

-- ('m2222222-aaaa-bbbb-cccc-dddddddddddd', 'd44705f0-9ccf-4c6c-b1e6-8007071573d7',
--  'USER_UUID_HERE', 'Structural engineer sent redlined plans. Need to review by Friday.',
--  'Team Member', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- ============================================
-- NOTES FOR TESTING:
-- ============================================
-- 1. Replace placeholder user IDs with actual auth.users IDs
-- 2. Adjust timestamps as needed for your testing
-- 3. Activity log entries will be created automatically as you use the AI tools
-- 4. To test AI capabilities:
--    - "Show me recent activity" → should return this seed data
--    - "Summarize all tasks" → should show breakdown by project and status
--    - "What's in the Design folder?" → should list files
--    - "Create a task to review electrical plans" → should create and log activity
--    - "Move Riverside project to Construction Documents phase" → should update and log
