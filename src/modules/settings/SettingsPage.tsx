import { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Bell,
  Shield,
  UserPlus,
  Check,
  Mail,
  AlertTriangle,
  ShoppingCart,
  Key,
  Smartphone,
  Pencil,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { PageHeader } from '../../shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle } from '../../shared/components/ui/Card';
import { Tabs } from '../../shared/components/ui/Tabs';
import { Input } from '../../shared/components/ui/Input';
import { Select } from '../../shared/components/ui/Select';
import { Button } from '../../shared/components/ui/Button';
import { Badge } from '../../shared/components/ui/Badge';

const SETTINGS_KEY = 'raices_erp_settings';

interface CompanySettings {
  companyName: string;
  defaultCurrency: string;
  timezone: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  newOrders: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
}

interface SettingsState {
  company: CompanySettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

const DEFAULT_SETTINGS: SettingsState = {
  company: {
    companyName: 'Raíces',
    defaultCurrency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires',
  },
  notifications: {
    emailNotifications: true,
    lowStockAlerts: true,
    newOrders: false,
  },
  security: {
    twoFactorEnabled: false,
  },
};

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'BRL', label: 'Real Brasileño (BRL)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (GMT-3)' },
  { value: 'America/Sao_Paulo', label: 'Brasil - São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'Estados Unidos - Este (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Estados Unidos - Pacífico (GMT-8)' },
  { value: 'Europe/Madrid', label: 'España (GMT+1)' },
];

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

const MOCK_USERS: MockUser[] = [
  { id: '1', name: 'Jorge Admin', email: 'admin@raices.com', role: 'admin' },
  { id: '2', name: 'María Editora', email: 'maria@raices.com', role: 'editor' },
  { id: '3', name: 'Carlos Visualizador', email: 'carlos@raices.com', role: 'viewer' },
];

const ROLE_LABELS: Record<MockUser['role'], string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
};

const ROLE_VARIANTS: Record<MockUser['role'], 'info' | 'success' | 'default'> = {
  admin: 'info',
  editor: 'success',
  viewer: 'default',
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

function GeneralTab({ settings, onChange }: { settings: SettingsState; onChange: (s: SettingsState) => void }) {
  const { company } = settings;
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Empresa</CardTitle>
      </CardHeader>
      <div className="space-y-5 mt-4">
        <Input
          label="Nombre de la Empresa"
          value={company.companyName}
          icon={<Building2 className="w-4 h-4" />}
          onChange={(e) =>
            onChange({ ...settings, company: { ...company, companyName: e.target.value } })
          }
        />
        <Select
          label="Moneda por Defecto"
          value={company.defaultCurrency}
          options={CURRENCY_OPTIONS}
          onChange={(e) =>
            onChange({ ...settings, company: { ...company, defaultCurrency: e.target.value } })
          }
        />
        <Select
          label="Zona Horaria"
          value={company.timezone}
          options={TIMEZONE_OPTIONS}
          onChange={(e) =>
            onChange({ ...settings, company: { ...company, timezone: e.target.value } })
          }
        />
      </div>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
      </CardHeader>
      <div className="flex items-center justify-between px-1 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Modo Oscuro</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cambiá entre tema claro y oscuro en toda la aplicación
            </p>
          </div>
        </div>
        <Toggle enabled={isDarkMode} onToggle={toggleDarkMode} />
      </div>
    </Card>
    </div>
  );
}

function UsuariosTab() {
  const [users] = useState<MockUser[]>(MOCK_USERS);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
          Invitar Usuario
        </Button>
      </div>
      <Card padding={false}>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {user.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={ROLE_VARIANTS[user.role]} size="sm">
                  {ROLE_LABELS[user.role]}
                </Badge>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-danger-600/10 text-slate-400 hover:text-danger-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function NotificacionesTab({ settings, onChange }: { settings: SettingsState; onChange: (s: SettingsState) => void }) {
  const { notifications } = settings;

  const toggles = [
    {
      key: 'emailNotifications' as const,
      label: 'Notificaciones por Email',
      description: 'Recibir resúmenes diarios y alertas importantes por correo',
      icon: <Mail className="w-5 h-5" />,
    },
    {
      key: 'lowStockAlerts' as const,
      label: 'Alertas de Stock Bajo',
      description: 'Aviso cuando un producto esté por debajo del mínimo',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      key: 'newOrders' as const,
      label: 'Nuevos Pedidos',
      description: 'Notificación cada vez que se genere un nuevo pedido',
      icon: <ShoppingCart className="w-5 h-5" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias de Notificación</CardTitle>
      </CardHeader>
      <div className="divide-y divide-slate-100 dark:divide-slate-700 mt-2">
        {toggles.map(({ key, label, description, icon }) => (
          <div key={key} className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                {icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
              </div>
            </div>
            <Toggle
              enabled={notifications[key]}
              onToggle={() =>
                onChange({
                  ...settings,
                  notifications: { ...notifications, [key]: !notifications[key] },
                })
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeguridadTab({ settings, onChange }: { settings: SettingsState; onChange: (s: SettingsState) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleChangePassword = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError('');

      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('Completá todos los campos');
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Las contraseñas no coinciden');
        return;
      }

      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 2000);
    },
    [currentPassword, newPassword, confirmPassword],
  );

  return (
    <div className="space-y-6">
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
          <Input
            label="Nueva Contraseña"
            type="password"
            icon={<Key className="w-4 h-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Confirmar Contraseña"
            type="password"
            icon={<Key className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            error={passwordError}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={saved ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              loading={false}
            >
              {saved ? 'Guardado' : 'Actualizar Contraseña'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autenticación de Dos Factores</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Autenticación en Dos Pasos
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Capa extra de seguridad con código de verificación
              </p>
            </div>
          </div>
          <Toggle
            enabled={settings.security.twoFactorEnabled}
            onToggle={() =>
              onChange({
                ...settings,
                security: { twoFactorEnabled: !settings.security.twoFactorEnabled },
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}

const TAB_ITEMS = [
  { id: 'general', label: 'General', icon: <Building2 className="w-4 h-4" /> },
  { id: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" />, count: MOCK_USERS.length },
  { id: 'notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
  { id: 'seguridad', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
];

export const SettingsPage = () => {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Preferencias del sistema"
        icon={<Settings className="w-5 h-5" />}
      />

      <Tabs tabs={TAB_ITEMS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'general' && <GeneralTab settings={settings} onChange={setSettings} />}
      {activeTab === 'usuarios' && <UsuariosTab />}
      {activeTab === 'notificaciones' && (
        <NotificacionesTab settings={settings} onChange={setSettings} />
      )}
      {activeTab === 'seguridad' && <SeguridadTab settings={settings} onChange={setSettings} />}
    </div>
  );
};
