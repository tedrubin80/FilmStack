-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_users_tenant_id_is_active_idx" ON "admin_users"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_users_last_login_idx" ON "admin_users"("last_login");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "festivals_tenant_id_is_active_idx" ON "festivals"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "festivals_start_date_end_date_idx" ON "festivals"("start_date", "end_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "festivals_submission_deadline_idx" ON "festivals"("submission_deadline");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "festivals_created_at_idx" ON "festivals"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "films_tenant_id_festival_id_idx" ON "films"("tenant_id", "festival_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "films_festival_id_status_idx" ON "films"("festival_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "films_status_submission_date_idx" ON "films"("status", "submission_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "films_submission_date_idx" ON "films"("submission_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "films_contact_email_idx" ON "films"("contact_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "judges_festival_id_is_active_idx" ON "judges"("festival_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "judges_tenant_id_is_active_idx" ON "judges"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_tenant_id_festival_id_idx" ON "payments"("tenant_id", "festival_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_stripe_payment_id_idx" ON "payments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_customer_email_idx" ON "payments"("customer_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_tenant_id_status_idx" ON "email_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_status_created_at_idx" ON "email_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_recipient_email_idx" ON "email_logs"("recipient_email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "email_logs"("sent_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_rooms_tenant_id_is_active_idx" ON "video_rooms"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_rooms_is_active_created_at_idx" ON "video_rooms"("is_active", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_is_active_idx" ON "api_keys"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "api_keys_expires_at_idx" ON "api_keys"("expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_logs_tenant_id_created_at_idx" ON "security_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_logs_event_type_created_at_idx" ON "security_logs"("event_type", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_logs_severity_created_at_idx" ON "security_logs"("severity", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "security_logs_ip_address_idx" ON "security_logs"("ip_address");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_access_logs_tenant_id_created_at_idx" ON "tenant_access_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_access_logs_user_id_created_at_idx" ON "tenant_access_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_export_requests_tenant_id_status_idx" ON "data_export_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_export_requests_user_id_request_type_idx" ON "data_export_requests"("user_id", "request_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "data_export_requests_status_requested_at_idx" ON "data_export_requests"("status", "requested_at");
