-- AvantDrive ERP — Row Level Security Policies
-- Applied AFTER the initial Prisma migration

-- Enable RLS on operational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE document_series FORCE ROW LEVEL SECURITY;
ALTER TABLE document_counters FORCE ROW LEVEL SECURITY;

-- Policy: Users can only see records from their own company
CREATE POLICY tenant_isolation_users ON users
  USING (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_approval_requests ON approval_requests
  USING (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_document_series ON document_series
  USING (company_scope = current_setting('app.current_tenant_id', true));

-- Insert policies — ensure new records get the correct company_scope
CREATE POLICY tenant_insert_users ON users
  FOR INSERT WITH CHECK (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_approval_requests ON approval_requests
  FOR INSERT WITH CHECK (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_audit_logs ON audit_logs
  FOR INSERT WITH CHECK (company_scope = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_insert_document_series ON document_series
  FOR INSERT WITH CHECK (company_scope = current_setting('app.current_tenant_id', true));

-- Superadmin bypass: the application role can bypass RLS when needed
-- This is set via SET ROLE when the service needs to do cross-tenant operations
CREATE ROLE avantdrive_superadmin NOLOGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO avantdrive_superadmin;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY superadmin_bypass_users ON users TO avantdrive_superadmin USING (true);
CREATE POLICY superadmin_bypass_approval_requests ON approval_requests TO avantdrive_superadmin USING (true);
CREATE POLICY superadmin_bypass_audit_logs ON audit_logs TO avantdrive_superadmin USING (true);
CREATE POLICY superadmin_bypass_document_series ON document_series TO avantdrive_superadmin USING (true);
CREATE POLICY superadmin_bypass_document_counters ON document_counters TO avantdrive_superadmin USING (true);
