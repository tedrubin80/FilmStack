import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

const C = {
  bg: 'oklch(0.09 0 0)',
  bgPanel: 'oklch(0.115 0 0)',
  bgRaised: 'oklch(0.14 0 0)',
  ink: 'oklch(0.95 0.006 80)',
  inkMuted: 'oklch(0.70 0.008 80)',
  inkDim: 'oklch(0.68 0.007 80)',
  primary: 'oklch(0.72 0.165 68)',
  primaryHover: 'oklch(0.60 0.155 68)',
  accent: 'oklch(0.55 0.190 22)',
  border: 'oklch(0.20 0 0)',
  borderBright: 'oklch(0.30 0.004 80)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.ink,
  padding: '0.625rem 0.875rem',
  fontSize: '0.9375rem',
  fontFamily: "'Barlow', system-ui, sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s',
};

const TABS: Array<{ id: string; label: string; href?: string }> = [
  { id: 'account', label: 'Account' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'emails', label: 'Emails', href: '/settings/emails' },
];

const NOTIFICATION_KEYS = [
  { key: 'newSubmissions', label: 'New film submissions', desc: 'Receive an alert when a filmmaker submits to your festival.' },
  { key: 'judgingComplete', label: 'Judging complete', desc: 'Notified when all judges have scored a film.' },
  { key: 'paymentReceived', label: 'Payment received', desc: 'Email confirmation for entry fee payments.' },
  { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A summary of activity across your festivals every Monday.' },
] as const;

function parseSettings(raw?: string) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

const SectionHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontFamily: "'Big Shoulders Display', sans-serif",
    fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: C.inkDim,
    paddingBottom: '0.875rem', marginBottom: '1.5rem',
    borderBottom: `1px solid ${C.border}`,
  }}>
    {children}
  </div>
);

const FieldBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{
      display: 'block', fontSize: '0.75rem', fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: C.inkDim, marginBottom: '0.5rem',
    }}>
      {label}
    </label>
    {children}
  </div>
);

const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = C.borderBright;
};
const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = C.border;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '2.5rem', height: '1.375rem',
        background: checked ? C.primary : C.border,
        border: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '0.1875rem',
        left: checked ? 'calc(100% - 1rem - 0.1875rem)' : '0.1875rem',
        width: '1rem', height: '1rem',
        background: checked ? 'oklch(0.97 0 0)' : C.bgRaised,
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuthStore();
  const [tab, setTab] = useState('account');
  const [saving, setSaving] = useState(false);

  const stored = useMemo(() => parseSettings(user?.tenant?.settings), [user?.tenant?.settings]);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});
  const [locale, setLocale] = useState({ language: 'en-US', timezone: 'America/Los_Angeles', dateFormat: 'MM/DD/YYYY', currency: 'USD' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || '');
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setNotifications({
      newSubmissions: stored.notifications?.newSubmissions ?? true,
      judgingComplete: stored.notifications?.judgingComplete ?? true,
      paymentReceived: stored.notifications?.paymentReceived ?? true,
      weeklyDigest: stored.notifications?.weeklyDigest ?? false,
    });
    setLocale({
      language: stored.locale?.language ?? 'en-US',
      timezone: stored.locale?.timezone ?? 'America/Los_Angeles',
      dateFormat: stored.locale?.dateFormat ?? 'MM/DD/YYYY',
      currency: stored.locale?.currency ?? 'USD',
    });
  }, [user, stored]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authService.updateProfile({ username, email, fullName });
      if (res.success && res.data?.user) {
        await refreshUser();
        toast.success('Account updated');
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const res = await authService.updatePreferences({ notifications });
      if (res.success) {
        await refreshUser();
        toast.success('Notification preferences saved');
      }
    } catch {
      toast.error('Failed to save notifications');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await authService.updatePreferences({ locale });
      if (res.success) {
        await refreshUser();
        toast.success('Preferences saved');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await authService.changePassword(passwords.current, passwords.next);
      if (res.success) {
        toast.success('Password updated');
        setPasswords({ current: '', next: '', confirm: '' });
      } else {
        toast.error(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const saveBtnStyle: React.CSSProperties = {
    fontFamily: "'Big Shoulders Display', sans-serif",
    fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em',
    padding: '0.75rem 1.625rem',
    background: C.primary, color: 'oklch(0.97 0 0)',
    border: 'none', cursor: saving ? 'wait' : 'pointer',
    opacity: saving ? 0.7 : 1,
  };

  return (
    <div style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          letterSpacing: '-0.01em', color: C.ink, lineHeight: 0.95, marginBottom: '0.625rem',
        }}>
          SETTINGS
        </h1>
        <p style={{ color: C.inkMuted, fontSize: '1rem' }}>Manage your account and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '3rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', position: 'sticky', top: '5rem' }}>
          {TABS.map(({ id, label, href }) => (
            href ? (
              <Link key={id} to={href} style={{
                textAlign: 'left', fontWeight: 500, fontSize: '0.9375rem',
                padding: '0.625rem 1rem', color: C.inkDim, textDecoration: 'none', display: 'block',
              }}>
                {label}
              </Link>
            ) : (
              <button key={id} type="button" onClick={() => setTab(id)} style={{
                textAlign: 'left', fontWeight: 500, fontSize: '0.9375rem',
                padding: '0.625rem 1rem',
                background: tab === id ? C.bgPanel : 'transparent',
                border: `1px solid ${tab === id ? C.border : 'transparent'}`,
                color: tab === id ? C.ink : C.inkDim, cursor: 'pointer',
              }}>
                {label}
              </button>
            )
          ))}
        </div>

        <div>
          {tab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <SectionHead>Account information</SectionHead>
              <FieldBlock label="Username">
                <input type="text" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} onFocus={focusBorder} onBlur={blurBorder} />
              </FieldBlock>
              <FieldBlock label="Full name">
                <input type="text" style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} onFocus={focusBorder} onBlur={blurBorder} />
              </FieldBlock>
              <FieldBlock label="Email">
                <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} onFocus={focusBorder} onBlur={blurBorder} />
              </FieldBlock>
              {user?.tenant && (
                <div style={{ padding: '1.25rem', background: C.bgPanel, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkDim, marginBottom: '0.5rem' }}>Organization</div>
                  <div style={{ fontSize: '0.9375rem', color: C.ink, fontWeight: 500, marginBottom: '0.25rem' }}>{user.tenant.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: C.inkDim }}>{user.tenant.subdomain}.{import.meta.env.VITE_ROOT_DOMAIN || 'localhost'} · {user.tenant.planType} plan</div>
                </div>
              )}
              <button type="button" onClick={saveProfile} disabled={saving} style={saveBtnStyle}>Save changes →</button>
            </div>
          )}

          {tab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <SectionHead>Notification preferences</SectionHead>
              {NOTIFICATION_KEYS.map((item) => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', padding: '1.125rem', border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: C.ink, marginBottom: '0.25rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.875rem', color: C.inkDim, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                  <Toggle checked={!!notifications[item.key]} onChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))} />
                </div>
              ))}
              <button type="button" onClick={saveNotifications} disabled={saving} style={saveBtnStyle}>Save notifications →</button>
            </div>
          )}

          {tab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <SectionHead>Security</SectionHead>
              <div style={{ padding: '1.75rem', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700, fontSize: '1rem', color: C.ink }}>Change password</div>
                <FieldBlock label="Current password">
                  <input type="password" style={inputStyle} value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder} />
                </FieldBlock>
                <FieldBlock label="New password">
                  <input type="password" style={inputStyle} value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder} />
                </FieldBlock>
                <FieldBlock label="Confirm new password">
                  <input type="password" style={inputStyle} value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder} />
                </FieldBlock>
                <button type="button" onClick={changePassword} disabled={saving} style={{ ...saveBtnStyle, alignSelf: 'flex-start' }}>Update password</button>
              </div>
              <div style={{ padding: '1.25rem', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', opacity: 0.6 }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: C.ink, marginBottom: '0.25rem' }}>Two-factor authentication</div>
                  <div style={{ fontSize: '0.875rem', color: C.inkDim }}>Coming soon — adds a second layer of protection.</div>
                </div>
                <Toggle checked={false} onChange={() => toast('Two-factor authentication coming soon', { icon: 'ℹ️' })} />
              </div>
            </div>
          )}

          {tab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <SectionHead>Preferences</SectionHead>
              <FieldBlock label="Language">
                <select style={inputStyle} value={locale.language} onChange={(e) => setLocale((p) => ({ ...p, language: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="en-US">English (US)</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </FieldBlock>
              <FieldBlock label="Time zone">
                <select style={inputStyle} value={locale.timezone} onChange={(e) => setLocale((p) => ({ ...p, timezone: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="America/Los_Angeles">(UTC-08:00) Pacific Time</option>
                  <option value="America/New_York">(UTC-05:00) Eastern Time</option>
                  <option value="UTC">(UTC+00:00) GMT</option>
                  <option value="Europe/Paris">(UTC+01:00) Central European Time</option>
                  <option value="Asia/Tokyo">(UTC+09:00) Japan Standard Time</option>
                </select>
              </FieldBlock>
              <FieldBlock label="Date format">
                <select style={inputStyle} value={locale.dateFormat} onChange={(e) => setLocale((p) => ({ ...p, dateFormat: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </FieldBlock>
              <FieldBlock label="Default currency">
                <select style={inputStyle} value={locale.currency} onChange={(e) => setLocale((p) => ({ ...p, currency: e.target.value }))} onFocus={focusBorder} onBlur={blurBorder}>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                </select>
              </FieldBlock>
              <button type="button" onClick={savePreferences} disabled={saving} style={saveBtnStyle}>Save preferences →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
