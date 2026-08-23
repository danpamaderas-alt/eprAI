import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  Key,
  Clock,
  Save,
  Check,
  Palette,
  Globe,
  Bell,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { Button } from '../../shared/components/ui/Button';
import { Avatar } from '../../shared/components/ui/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';

const PROFILE_KEY = 'raices_erp_profile';
const ACTIVITY_KEY = 'raices_erp_activity_log';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  language: string;
  notificationsEnabled: boolean;
}

interface ActivityEntry {
  action: string;
  timestamp: string;
}

const DEFAULT_PROFILE: ProfileData = {
  fullName: '',
  email: '',
  phone: '',
  language: 'es',
  notificationsEnabled: true,
};

function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile: ProfileData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function logActivity(action: string) {
  const log = loadActivityLog();
  log.unshift({ action, timestamp: new Date().toISOString() });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(0, 50)));
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        enabled ? 'bg-success-600' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const { setMode, isDarkMode } = useThemeStore();

  const authName = user?.user_metadata?.full_name || user?.email || 'Operador';
  const authEmail = user?.email || '';

  const [profile, setProfile] = useState<ProfileData>(() => {
    const loaded = loadProfile();
    if (!loaded.fullName) loaded.fullName = authName;
    if (!loaded.email) loaded.email = authEmail;
    return loaded;
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [profileSaved, setProfileSaved] = useState(false);

  const activityLog = useMemo(() => loadActivityLog(), []);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const handleSaveProfile = useCallback(() => {
    saveProfile(profile);
    logActivity('Perfil actualizado');
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }, [profile]);

  const handleChangePassword = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError('');

      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('Completá todos los campos');
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError('Mínimo 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Las contraseñas no coinciden');
        return;
      }

      logActivity('Contraseña cambiada');
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 2000);
    },
    [currentPassword, newPassword, confirmPassword],
  );

  const handleToggleTheme = useCallback(() => {
    setMode(isDarkMode ? 'light' : 'dark');
    logActivity(`Tema cambiado a ${isDarkMode ? 'claro' : 'oscuro'}`);
  }, [isDarkMode, setMode]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        subtitle="Gestioná tu información personal"
        icon={<User className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN — Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <div className="flex items-start gap-6 mt-4">
              <Avatar name={profile.fullName} size="lg" className="mt-1" />
              <div className="flex-1 space-y-4">
                <Input
                  label="Nombre Completo"
                  value={profile.fullName}
                  icon={<User className="w-4 h-4" />}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                />
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={profile.email}
                  icon={<Mail className="w-4 h-4" />}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  value={profile.phone}
                  icon={<Phone className="w-4 h-4" />}
                  placeholder="+54 9 11 0000-0000"
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={profileSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    onClick={handleSaveProfile}
                  >
                    {profileSaved ? 'Guardado' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
            </CardHeader>
            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <Input
                label="Contraseña Actual"
                type="password"
                icon={<Key className="w-4 h-4" />}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  icon={<Key className="w-4 h-4" />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar"
                  type="password"
                  icon={<Key className="w-4 h-4" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  error={passwordError}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  icon={passwordSaved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                >
                  {passwordSaved ? 'Actualizada' : 'Actualizar Contraseña'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN — Sidebar info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 mt-2">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Tema</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isDarkMode ? 'Oscuro' : 'Claro'}
                    </p>
                  </div>
                </div>
                <Toggle enabled={isDarkMode} onToggle={handleToggleTheme} />
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Idioma</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {profile.language === 'es' ? 'Español' : 'English'}
                    </p>
                  </div>
                </div>
                <select
                  value={profile.language}
                  onChange={(e) => {
                    setProfile({ ...profile, language: e.target.value });
                    logActivity('Idioma cambiado');
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Notificaciones</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {profile.notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                    </p>
                  </div>
                </div>
                <Toggle
                  enabled={profile.notificationsEnabled}
                  onToggle={() => {
                    setProfile({ ...profile, notificationsEnabled: !profile.notificationsEnabled });
                    logActivity(
                      `Notificaciones ${profile.notificationsEnabled ? 'activadas' : 'desactivadas'}`,
                    );
                  }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {activityLog.length === 0 ? (
                <div className="px-6 py-4 text-center">
                  <Clock className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                    Sin actividad registrada
                  </p>
                </div>
              ) : (
                activityLog.map((entry, i) => (
                  <div key={`${entry.timestamp}-${i}`} className="px-6 py-2.5 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {entry.action}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(entry.timestamp).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
