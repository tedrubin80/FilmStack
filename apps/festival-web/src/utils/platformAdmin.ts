import type { User } from '@/types';

export function isPlatformAdmin(user: User | null): boolean {
  if (!user?.tenant?.settings) return false;
  try {
    const settings = JSON.parse(user.tenant.settings);
    return settings.platform_admin === true && settings.access_level === 'superuser';
  } catch {
    return false;
  }
}
