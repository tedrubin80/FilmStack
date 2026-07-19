import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import EmailTemplatesManager from '@/components/EmailTemplatesManager';

export const EmailsSettingsPage: React.FC = () => {
  const createTemplate = async (template: {
    name: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables: string;
    isActive: boolean;
  }) => {
    await api.post('/emails/templates', template);
    toast.success('Template created');
  };

  const sendEmail = async (recipientEmail: string, templateName: string, variables?: Record<string, string>) => {
    await api.post('/emails/send', { recipientEmail, templateName, variables });
    toast.success('Email queued');
  };

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <Link to="/settings" style={{ color: 'oklch(0.68 0.007 80)', textDecoration: 'none', fontSize: '0.875rem', display: 'block', marginBottom: '1.25rem' }}>
        ← Back to settings
      </Link>
      <EmailTemplatesManager onCreateTemplate={createTemplate} onSendEmail={sendEmail} />
    </div>
  );
};
