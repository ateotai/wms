-- Activity logs table for auditing user actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_role text,
  action_type text CHECK (action_type IN ('login','logout','create','update','delete','view','config','permission')),
  action text,
  resource text,
  resource_id text,
  details text,
  ip_address text,
  user_agent text,
  status text CHECK (status IN ('success','warning','error')),
  duration integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes to speed up queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs (action_type);

-- Enable RLS and basic policies (read by authenticated; insert by service role)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow select for authenticated users
DROP POLICY IF EXISTS "Authenticated can read activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated can read activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (true);

-- Insert restricted; typically from backend using service role
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.activity_logs;
CREATE POLICY "Service role can insert activity logs" ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);