'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Save, Loader2, AlertTriangle, CheckCircle, Bell, BellOff, Volume2, VolumeX, Users, Trash2, Search, X, Mail, Phone, Shield, UserPlus, KeyRound, Eye, EyeOff, ShieldCheck, UserCheck, Calendar, ChevronDown, Send } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateProfile, deleteUserAccount, createStudentAccount, updateUserRole, changePassword, updateSemesterConfig, updateAvatar, removeAvatar, updateNotifEnabled, updateTelegramConfig } from '@/lib/actions/profile';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { playNotificationChime } from '@/lib/utils/audio';

function getBdSuffix(num: string | null | undefined): string {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('1')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits.slice(1);
  }
  if (digits.length === 13 && digits.startsWith('8801')) {
    return digits.slice(3);
  }
  return digits;
}

const formatBdPhoneInput = (val: string) => {
  let cleaned = val.replace(/\D/g, ''); // only digits
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10); // max 10 digits
};

interface ProfileFormProps {
  profile: Profile;
  allProfiles?: Pick<Profile, 'id' | 'full_name' | 'university_id' | 'email' | 'phone' | 'role' | 'password_reset_required'>[];
  semesterConfig?: { total_weeks: number; start_date: string };
  telegramConfig?: { bot_token: string | null; channel_id: string | null; is_enabled: boolean };
}

export function ProfileForm({ 
  profile: initialProfile, 
  allProfiles = [], 
  semesterConfig,
  telegramConfig
}: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.profile_pic_url);
  const [phoneVal, setPhoneVal] = useState(getBdSuffix(initialProfile.phone));
  const [whatsappVal, setWhatsAppVal] = useState(getBdSuffix(initialProfile.whatsapp));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [className, setClassName] = useState('');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [nativePermission, setNativePermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('tenant_class_name');
      if (stored) setClassName(stored.trim());
      
      if ('Notification' in window) {
        setBrowserPermission(Notification.permission);
      }

      if (window.Capacitor) {
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
          PushNotifications.checkPermissions().then((status) => {
            setNativePermission(status.receive);
          });
        }).catch((err) => {
          console.warn('Failed to check native push permissions:', err);
        });
      }
    }
  }, []);

  // Notification toggles
  const [notifEnabled, setNotifEnabled] = useState(initialProfile.notif_enabled);

  // Web push toggle handlers removed (FCM active in APK)

  // Manage Accounts states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [accountsList, setAccountsList] = useState(allProfiles);
  const [activeAccountTab, setActiveAccountTab] = useState<'verified' | 'pending'>('verified');

  // Create Student modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({
    full_name: '', email: '', university_id: '',
    password: '',
  });

  // Change Password states
  const [cpCurrentPass, setCpCurrentPass] = useState('');
  const [cpNewPass, setCpNewPass] = useState('');
  const [cpConfirmPass, setCpConfirmPass] = useState('');
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpPending, setCpPending] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);

  // Semester settings states
  const [semesterWeeks, setSemesterWeeks] = useState(semesterConfig?.total_weeks || 14);
  const [semesterStart, setSemesterStart] = useState(semesterConfig?.start_date || '2026-05-20');
  const [isConfigPending, setIsConfigPending] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Telegram settings states
  const [telegramToken, setTelegramToken] = useState(telegramConfig?.bot_token || '');
  const [telegramChannel, setTelegramChannel] = useState(telegramConfig?.channel_id || '');
  const [telegramEnabled, setTelegramEnabled] = useState(telegramConfig?.is_enabled || false);
  const [isTelegramPending, setIsTelegramPending] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSuccess, setTelegramSuccess] = useState(false);

  // Accordion open/close states
  const [isClassAdminOpen, setIsClassAdminOpen] = useState(false);
  const [isSemesterSettingsOpen, setIsSemesterSettingsOpen] = useState(false);
  const [isTelegramSettingsOpen, setIsTelegramSettingsOpen] = useState(false);
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Avatar upload states
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  async function handleSaveSemesterConfig() {
    setIsConfigPending(true);
    setConfigError(null);
    setConfigSuccess(false);
    try {
      const fd = new FormData();
      fd.set('total_weeks', String(semesterWeeks));
      fd.set('start_date', semesterStart);
      
      const res = await updateSemesterConfig(fd);
      if (res.error) {
        setConfigError(res.error);
      } else {
        setConfigSuccess(true);
      }
    } catch (err: any) {
      setConfigError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsConfigPending(false);
    }
  }

  async function handleSaveTelegramConfig() {
    setIsTelegramPending(true);
    setTelegramError(null);
    setTelegramSuccess(false);
    try {
      const fd = new FormData();
      fd.set('bot_token', telegramToken);
      fd.set('channel_id', telegramChannel);
      fd.set('is_enabled', String(telegramEnabled));
      
      const res = await updateTelegramConfig(fd);
      if (res.error) {
        setTelegramError(res.error);
      } else {
        setTelegramSuccess(true);
      }
    } catch (err: any) {
      setTelegramError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsTelegramPending(false);
    }
  }



  async function handleRoleToggle(targetUser: typeof allProfiles[0]) {
    const newRole = targetUser.role === 'cr' || targetUser.role === 'admin' ? 'student' : 'cr';
    const label = newRole === 'cr' ? 'promote to CR' : 'demote to Student';
    if (!confirm(`Are you sure you want to ${label} ${targetUser.full_name}?\n\nThey will need to sign out and back in for the change to take effect.`)) return;
    setActionPendingId(targetUser.id);
    try {
      const res = await updateUserRole(targetUser.id, newRole);
      if (res.error) {
        alert(res.error);
      } else {
        setAccountsList(prev => prev.map(acc =>
          acc.id === targetUser.id ? { ...acc, role: newRole } : acc
        ));
      }
    } catch (err) {
      alert('Failed to update role');
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleDeleteAccount(targetUser: typeof allProfiles[0]) {
    if (!confirm(`WARNING: Are you sure you want to permanently delete ${targetUser.full_name}'s account (${targetUser.university_id})?\n\nThis will remove their profile and all associated data. This action cannot be undone.`)) {
      return;
    }
    
    setActionPendingId(targetUser.id);
    try {
      const res = await deleteUserAccount(targetUser.id);
      if (res && res.error) {
        alert(res.error);
      } else {
        // Remove from local list
        setAccountsList(prev => prev.filter(acc => acc.id !== targetUser.id));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user account');
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setIsCreating(true);
    try {
      const res = await createStudentAccount(newStudent);
      if (res.error) {
        setCreateError(res.error);
      } else {
        setCreateSuccess(`Account created for ${newStudent.full_name}. They must reset their password on first login.`);
        
        // Append to accounts list locally so the modal updates in real-time
        const createdUser = {
          id: res.userId || Math.random().toString(),
          full_name: newStudent.full_name,
          email: newStudent.email,
          university_id: newStudent.university_id.toUpperCase(),
          phone: '',
          role: 'student' as const,
          password_reset_required: true,
        };
        setAccountsList(prev => [...prev, createdUser]);
        
        setNewStudent({ full_name: '', email: '', university_id: '', password: '' });
      }
    } catch (err: any) {
      setCreateError(err.message || 'Unexpected error.');
    } finally {
      setIsCreating(false);
    }
  }

  const filteredAccounts = accountsList.filter((acc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      acc.full_name.toLowerCase().includes(term) ||
      acc.university_id.toLowerCase().includes(term) ||
      acc.email.toLowerCase().includes(term) ||
      (acc.phone && acc.phone.includes(term))
    );
    if (!matchesSearch) return false;

    if (activeAccountTab === 'pending') {
      return acc.password_reset_required === true;
    } else {
      return acc.password_reset_required !== true;
    }
  });

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(false);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose a valid image file.');
      return;
    }

    setIsAvatarUploading(true);

    try {
      // Set temporary local preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      // Compress image
      const options = {
        maxSizeMB: 0.5, // limit to 500KB
        maxWidthOrHeight: 400, // max 400x400px
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.set('avatar', compressedFile, compressedFile.name);

      const res = await updateAvatar(formData);
      if (res.error) {
        setAvatarError(res.error);
        setAvatarPreview(profile.profile_pic_url);
      } else {
        setAvatarSuccess(true);
        if (res.url) {
          setAvatarPreview(res.url);
          setProfile(prev => ({ ...prev, profile_pic_url: res.url }));
        }
      }
    } catch (err) {
      console.error('Avatar upload/compression error:', err);
      setAvatarError('Failed to upload avatar image.');
      setAvatarPreview(profile.profile_pic_url);
    } finally {
      setIsAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    setIsAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(false);

    try {
      const res = await removeAvatar();
      if (res.error) {
        setAvatarError(res.error);
      } else {
        setAvatarSuccess(true);
        setAvatarPreview(null);
        setProfile(prev => ({ ...prev, profile_pic_url: null }));
      }
    } catch (err) {
      console.error('Remove avatar error:', err);
      setAvatarError('Failed to remove profile picture.');
    } finally {
      setIsAvatarUploading(false);
    }
  }


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Append notification settings manually since they are toggles
    formData.set('notif_enabled', String(notifEnabled));

    try {
      const res = await updateProfile(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        // Refresh context / page data
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {/* Left Column: Avatar & Notifications */}
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Avatar Card */}
        <div className="glass-card p-4 sm:p-6 flex flex-col items-center justify-center gap-4 text-center hover:scale-[1.01]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-border bg-muted/30 transition-colors shadow-inner flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-extrabold text-muted-foreground uppercase">
                    {profile.full_name.slice(0, 2)}
                  </div>
                )}
                {isAvatarUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center animate-fade-in backdrop-blur-[2px]">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isAvatarUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isPending || isAvatarUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
              disabled={isPending || isAvatarUploading}
            />
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <h3 className="font-bold text-base text-foreground tracking-tight">{profile.full_name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{profile.university_id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                profile.role === 'cr' || profile.role === 'admin'
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
              }`}>
                {profile.role.toUpperCase()}
              </span>
            </div>
            {className && (
              <span className="text-xs font-bold text-muted-foreground mt-1 select-none text-center block w-full">
                {className}
              </span>
            )}
            {avatarError && (
              <span className="text-[10px] text-rose-400 font-semibold leading-relaxed mt-1 animate-fade-in block">
                {avatarError}
              </span>
            )}
            {avatarSuccess && (
              <span className="text-[10px] text-emerald-400 font-semibold leading-relaxed mt-1 animate-fade-in block">
                Avatar updated!
              </span>
            )}
          </div>
        </div>

        {/* Notifications Card */}
        <div className="glass-card p-4 sm:p-6 flex flex-col gap-4">
          <h3 className="font-bold text-sm text-foreground border-b border-border/60 pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notification Preferences
          </h3>

          <div className="flex flex-col gap-4">
            {/* Toggle 1: Enable Notifs */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">In-App Notifications</span>
                <span className="text-[10px] text-muted-foreground">Receive real-time alerts</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const nextVal = !notifEnabled;
                  
                  if (nextVal) {
                    // 1. Web Browser Permission Flow
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      let currentPermission = Notification.permission;
                      
                      if (currentPermission === 'default') {
                        currentPermission = await Notification.requestPermission();
                        setBrowserPermission(currentPermission);
                      }
                    }
                    
                    // 2. Native Capacitor App Permission Flow
                    if (typeof window !== 'undefined' && window.Capacitor) {
                      try {
                        const { PushNotifications } = await import('@capacitor/push-notifications');
                        const permission = await PushNotifications.requestPermissions();
                        setNativePermission(permission.receive);
                      } catch (err) {
                        console.error('Failed to request native push permissions:', err);
                      }
                    }
                  }
                  
                  setIsPending(true);
                  try {
                    const res = await updateNotifEnabled(nextVal);
                    if (res && res.error) {
                      alert(res.error);
                    } else {
                      setNotifEnabled(nextVal);
                      if (nextVal) {
                        playNotificationChime();
                      }
                      window.location.reload();
                    }
                  } catch (err: any) {
                    alert(err.message || 'Failed to update notification settings.');
                  } finally {
                    setIsPending(false);
                  }
                }}
                disabled={isPending}
                className={`touch-compact relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show warnings if blocked in browser settings */}
            {browserPermission === 'denied' && (
              <div className="text-[10px] text-rose-400 font-semibold leading-relaxed border-t border-border/40 pt-2.5 mt-1.5 flex items-start gap-1.5 animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
                <span>
                  Notifications are blocked in your browser settings. Click the lock/settings icon in the address bar to allow them, then reload.
                </span>
              </div>
            )}

            {/* Show warnings/request again if blocked in Capacitor (mobile app) settings */}
            {typeof window !== 'undefined' && window.Capacitor && nativePermission === 'denied' && (
              <div className="text-[10px] text-rose-400 font-semibold leading-relaxed border-t border-border/40 pt-2.5 mt-1.5 flex flex-col gap-2 animate-fade-in">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    Notification permissions are blocked in your phone settings. You can try to reset and prompt again below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsPending(true);
                    try {
                      const { PushNotifications } = await import('@capacitor/push-notifications');
                      const permission = await PushNotifications.requestPermissions();
                      setNativePermission(permission.receive);
                      if (permission.receive === 'granted') {
                        await PushNotifications.register();
                        await updateNotifEnabled(true);
                        setNotifEnabled(true);
                        alert('Notifications enabled and registered successfully!');
                        window.location.reload();
                      } else {
                        alert('Still denied. Please open your phone App settings, select ClassApp, and allow notifications manually.');
                      }
                    } catch (err: any) {
                      console.error('Failed to request permissions again:', err);
                      alert(err.message || 'Failed to request permissions.');
                    } finally {
                      setIsPending(false);
                    }
                  }}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-[10px] font-bold text-primary transition-all self-start cursor-pointer disabled:opacity-50"
                >
                  Reset &amp; Request Permission Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Settings & Preferences */}
      <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
        {/* Personal & Contact Details */}
        <div className={`glass-card flex flex-col transition-all duration-200 ${
          isPersonalInfoOpen ? 'p-4 sm:p-6 md:p-8 gap-5 sm:gap-6' : 'py-3.5 px-4 sm:px-5 md:py-4 md:px-6 gap-0'
        }`}>
          <button
            type="button"
            onClick={() => setIsPersonalInfoOpen(!isPersonalInfoOpen)}
            className={`w-full flex items-center justify-between cursor-pointer select-none text-left focus:outline-none group ${
              isPersonalInfoOpen ? 'border-b border-border/60 pb-2' : ''
            }`}
          >
            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Personal & Contact Details
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                isPersonalInfoOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          {isPersonalInfoOpen && (
            <div className="animate-fade-in flex flex-col gap-6">
              {error && (
                <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {/* Personal Information */}
              <div className="flex flex-col gap-4">
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1.5">
                  Personal Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="full_name" className="text-xs font-semibold text-foreground">
                      Full Name
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      required
                      defaultValue={profile.full_name}
                      className="form-input"
                      disabled={isPending}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="phone" className="text-xs font-semibold text-foreground">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold select-none flex items-center gap-1 border-r border-border/60 pr-2 pb-0.5">
                        <span className="text-sm">🇧🇩</span>
                        <span>+880</span>
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={phoneVal}
                        onChange={(e) => setPhoneVal(formatBdPhoneInput(e.target.value))}
                        placeholder="1712345678"
                        className="form-input pl-[76px] font-mono tracking-wider"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden Social Links to preserve existing data on form submission */}
              <input type="hidden" name="whatsapp" value={profile.whatsapp || ''} />
              <input type="hidden" name="telegram_handle" value={profile.telegram_handle || ''} />

              {/* Save Button */}
              <div className="flex justify-end pt-2 border-t border-border mt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>



        {/* ── Change Password Card ────────────────────────── */}
        <div className={`glass-card flex flex-col transition-all duration-200 ${
          isChangePasswordOpen ? 'p-4 sm:p-6 md:p-8 gap-4 sm:gap-5' : 'py-3.5 px-4 sm:px-5 md:py-4 md:px-6 gap-0'
        }`}>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
            className={`w-full flex items-center justify-between cursor-pointer select-none text-left focus:outline-none group ${
              isChangePasswordOpen ? 'border-b border-border pb-3' : ''
            }`}
          >
            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Change Password
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                isChangePasswordOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          {isChangePasswordOpen && (
            <div className="animate-fade-in flex flex-col gap-5">
              <p className="text-xs text-muted-foreground">
                Enter your current password to set a new one. Minimum 8 characters.
              </p>

              {cpError && (
                <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                  {cpError}
                </div>
              )}
              {cpSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Password changed successfully!
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Current Password</label>
                  <div className="relative">
                    <input
                      type={cpShowCurrent ? 'text' : 'password'}
                      value={cpCurrentPass}
                      onChange={e => setCpCurrentPass(e.target.value)}
                      placeholder="Your current password"
                      className="form-input pr-10"
                      disabled={cpPending}
                    />
                    <button
                      type="button"
                      onClick={() => setCpShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {cpShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">New Password</label>
                  <div className="relative">
                    <input
                      type={cpShowNew ? 'text' : 'password'}
                      value={cpNewPass}
                      onChange={e => setCpNewPass(e.target.value)}
                      placeholder="At least 8 characters"
                      className="form-input pr-10"
                      disabled={cpPending}
                    />
                    <button
                      type="button"
                      onClick={() => setCpShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    value={cpConfirmPass}
                    onChange={e => setCpConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    className="form-input"
                    disabled={cpPending}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={cpPending || !cpCurrentPass || !cpNewPass || !cpConfirmPass}
                    onClick={async () => {
                      setCpError(null);
                      setCpSuccess(false);
                      if (cpNewPass !== cpConfirmPass) {
                        setCpError('New passwords do not match.');
                        return;
                      }
                      if (cpNewPass.length < 8) {
                        setCpError('New password must be at least 8 characters.');
                        return;
                      }
                      setCpPending(true);
                      try {
                        const res = await changePassword(cpCurrentPass, cpNewPass);
                        if (res.error) {
                          setCpError(res.error);
                        } else {
                          // BUG-08 fix: server action can't write new cookies, so we
                          // do a client-side re-sign-in to refresh the JWT in the browser.
                          if (res.requiresReLogin && res.email) {
                            const supabase = getSupabaseBrowserClient();
                            await supabase.auth.signInWithPassword({
                              email: res.email,
                              password: cpNewPass,
                            });
                          }
                          setCpSuccess(true);
                          setCpCurrentPass('');
                          setCpNewPass('');
                          setCpConfirmPass('');
                        }
                      } catch (err: any) {
                        setCpError(err.message || 'An error occurred.');
                      } finally {
                        setCpPending(false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {cpPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                    ) : (
                      <><KeyRound className="w-4 h-4" /> Update Password</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manage Accounts Card (CR/Admin only) */}
        {(profile.role === 'cr' || profile.role === 'admin') && allProfiles.length > 0 && (
          <div className={`glass-card flex flex-col transition-all duration-200 ${
            isClassAdminOpen ? 'p-4 sm:p-6 gap-4' : 'py-3.5 px-4 sm:px-5 gap-0'
          }`}>
            <button
              type="button"
              onClick={() => setIsClassAdminOpen(!isClassAdminOpen)}
              className={`w-full flex items-center justify-between cursor-pointer select-none text-left focus:outline-none group ${
                isClassAdminOpen ? 'border-b border-border/60 pb-2' : ''
              }`}
            >
              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Class Administration
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                  isClassAdminOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>

            {isClassAdminOpen && (
              <div className="animate-fade-in flex flex-col gap-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  As a Class Representative, you can view, edit roles, and delete authorized student accounts for this batch.
                </p>
                <div className="flex flex-col gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreateModalOpen(true); setCreateError(null); setCreateSuccess(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Create Student Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground border border-border bg-muted/20 hover:bg-muted/40 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-primary" />
                    Manage Accounts ({accountsList.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Semester Settings Card (CR/Admin only) */}
        {(profile.role === 'cr' || profile.role === 'admin') && (
          <div className={`glass-card flex flex-col transition-all duration-200 ${
            isSemesterSettingsOpen ? 'p-4 sm:p-6 gap-4' : 'py-3.5 px-4 sm:px-5 gap-0'
          }`}>
            <button
              type="button"
              onClick={() => setIsSemesterSettingsOpen(!isSemesterSettingsOpen)}
              className={`w-full flex items-center justify-between cursor-pointer select-none text-left focus:outline-none group ${
                isSemesterSettingsOpen ? 'border-b border-border pb-2' : ''
              }`}
            >
              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Semester Settings
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                  isSemesterSettingsOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>
            
            {isSemesterSettingsOpen && (
              <div className="animate-fade-in flex flex-col gap-4">
                {!semesterConfig ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex flex-col gap-2 text-xs leading-relaxed text-left">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      Database Migration Required
                    </div>
                    <p>
                      The semester settings option is unavailable because the required database columns do not exist in your database yet.
                    </p>
                    <p className="font-mono text-[10px] mt-1 bg-black/30 p-2 rounded">
                      Please run the SQL statements in the files:
                      <br />• supabase/migrations/0008_semester_start_date.sql
                      <br />• supabase/migrations/0009_remove_profile_fields.sql
                      <br />inside your Supabase SQL Editor.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Configure the total weeks and starting date for this semester&apos;s timeline.
                    </p>
                    
                    <div className="flex flex-col gap-3 mt-2">
                      {configError && (
                        <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                          {configError}
                        </div>
                      )}
                      {configSuccess && (
                        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                          Semester settings saved successfully!
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="total_weeks" className="text-xs font-semibold text-foreground">
                          Total Weeks
                        </label>
                        <input
                          id="total_weeks"
                          type="number"
                          min="1"
                          max="52"
                          required
                          value={semesterWeeks}
                          onChange={(e) => setSemesterWeeks(parseInt(e.target.value, 10))}
                          className="form-input text-xs"
                          disabled={isConfigPending}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="start_date" className="text-xs font-semibold text-foreground">
                          Semester Start Date (Wednesday of Week 1)
                        </label>
                        <input
                          id="start_date"
                          type="date"
                          required
                          value={semesterStart}
                          onChange={(e) => setSemesterStart(e.target.value)}
                          className="form-input text-xs"
                          disabled={isConfigPending}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSemesterConfig}
                        disabled={isConfigPending}
                        className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isConfigPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Settings
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Telegram Settings Card (CR/Admin only) */}
        {(profile.role === 'cr' || profile.role === 'admin') && (
          <div className={`glass-card flex flex-col transition-all duration-200 ${
            isTelegramSettingsOpen ? 'p-4 sm:p-6 gap-4' : 'py-3.5 px-4 sm:px-5 gap-0'
          }`}>
            <button
              type="button"
              onClick={() => setIsTelegramSettingsOpen(!isTelegramSettingsOpen)}
              className={`w-full flex items-center justify-between cursor-pointer select-none text-left focus:outline-none group ${
                isTelegramSettingsOpen ? 'border-b border-border pb-2' : ''
              }`}
            >
              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                Telegram Announcements Mirroring
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-200 ${
                  isTelegramSettingsOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            </button>
            
            {isTelegramSettingsOpen && (
              <div className="animate-fade-in flex flex-col gap-4">
                {telegramConfig === undefined ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex flex-col gap-2 text-xs leading-relaxed text-left">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      Database Migration Required
                    </div>
                    <p>
                      The Telegram settings option is unavailable because the `telegram_config` table does not exist in your database yet.
                    </p>
                    <p className="font-mono text-[10px] mt-1 bg-black/30 p-2 rounded">
                      Please run the SQL statements from your setup file in your Supabase SQL Editor.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Mirror all class announcements and files automatically to a custom Telegram channel.
                    </p>
                    
                    <div className="flex flex-col gap-3 mt-2">
                      {telegramError && (
                        <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                          {telegramError}
                        </div>
                      )}
                      {telegramSuccess && (
                        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                          Telegram settings saved successfully!
                        </div>
                      )}

                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center justify-between gap-4 bg-muted/10 p-3 rounded-xl border border-border/40">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-foreground">Mirror to Telegram</span>
                          <span className="text-[10px] text-muted-foreground">Toggle mirroring on or off</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTelegramEnabled(!telegramEnabled)}
                          disabled={isTelegramPending}
                          className={`touch-compact relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            telegramEnabled ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              telegramEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Bot Token Input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="telegram_bot_token" className="text-xs font-semibold text-foreground">
                          Telegram Bot Token
                        </label>
                        <input
                          id="telegram_bot_token"
                          type="password"
                          placeholder="8630296780:AAG..."
                          value={telegramToken}
                          onChange={(e) => setTelegramToken(e.target.value)}
                          className="form-input text-xs font-mono"
                          disabled={isTelegramPending}
                        />
                      </div>

                      {/* Channel ID Input */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="telegram_channel_id" className="text-xs font-semibold text-foreground">
                          Telegram Channel ID (e.g. @mychannel or -100xxx)
                        </label>
                        <input
                          id="telegram_channel_id"
                          type="text"
                          placeholder="@classapp_announcements"
                          value={telegramChannel}
                          onChange={(e) => setTelegramChannel(e.target.value)}
                          className="form-input text-xs font-mono"
                          disabled={isTelegramPending}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveTelegramConfig}
                        disabled={isTelegramPending}
                        className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isTelegramPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Settings
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </form>

      {/* Manage Student Accounts Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-card border border-border/60 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border/60 flex items-center justify-between flex-shrink-0 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    Manage Accounts
                  </h2>
                  <p className="text-xs text-muted-foreground">Total authorized students: {accountsList.length}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 md:p-6 border-b border-border/60 flex-shrink-0 bg-muted/10 flex flex-col gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students by name, ID, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border/40 -mx-4 md:-mx-6 px-4 md:px-6">
                <button
                  type="button"
                  onClick={() => setActiveAccountTab('verified')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeAccountTab === 'verified'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Verified ({accountsList.filter(a => a.password_reset_required !== true).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAccountTab('pending')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeAccountTab === 'pending'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending Verification ({accountsList.filter(a => a.password_reset_required === true).length})
                  {accountsList.filter(a => a.password_reset_required === true).length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background/30">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-muted-foreground">No student accounts found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {activeAccountTab === 'pending'
                      ? 'No accounts are currently pending first-login activation'
                      : 'No verified accounts match your search'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Table Header (Desktop only) */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border/40">
                    <div className="col-span-4">Student</div>
                    <div className="col-span-3">Contact Details</div>
                    <div className="col-span-1 text-center">Role</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right pr-2">Actions</div>
                  </div>

                  {filteredAccounts.map((student) => {
                    const isSelf = student.id === profile.id;
                    const initials = student.full_name ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

                    return (
                      <div
                        key={student.id}
                        className="bg-muted/10 border border-border/40 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-all hover:bg-muted/20"
                      >
                        {/* Student Meta Info */}
                        <div className="col-span-1 md:col-span-4 flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center font-bold text-xs text-muted-foreground uppercase flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                              {student.full_name}
                              {isSelf && (
                                <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                                  You
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{student.university_id}</p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="col-span-1 md:col-span-3 flex flex-col gap-1.5 text-xs text-muted-foreground min-w-0">
                          <a
                            href={`mailto:${student.email}`}
                            className="flex items-center gap-2 hover:text-foreground transition-colors truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </a>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                            <span className="truncate">{student.phone || 'No phone number'}</span>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="col-span-1 md:col-span-1 flex items-center md:justify-center justify-start">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              student.role === 'cr' || student.role === 'admin'
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {student.role.toUpperCase()}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="col-span-1 md:col-span-2 flex items-center md:justify-center justify-start">
                          {student.password_reset_required === true ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Pending Reset
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                              Verified
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 border-t border-border/40 pt-3 md:pt-0 md:border-0">
                          <div className="flex items-center gap-2 ml-auto md:ml-0">

                            {/* Role Toggle Button — only for non-self rows */}
                            {!isSelf && (
                              <button
                                type="button"
                                disabled={actionPendingId !== null}
                                onClick={() => handleRoleToggle(student)}
                                className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 ${
                                  student.role === 'cr' || student.role === 'admin'
                                    ? 'border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300'
                                    : 'border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300'
                                }`}
                                title={student.role === 'cr' || student.role === 'admin' ? 'Demote to Student' : 'Promote to CR'}
                              >
                                {actionPendingId === student.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : student.role === 'cr' || student.role === 'admin' ? (
                                  <UserCheck className="w-4 h-4" />
                                ) : (
                                  <Shield className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            {!isSelf && (
                              <button
                                type="button"
                                disabled={actionPendingId !== null}
                                onClick={() => handleDeleteAccount(student)}
                                className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                                title="Delete Account"
                              >
                                {actionPendingId === student.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Student Account Modal ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border/60 rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}>
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Create Student Account</h2>
                  <p className="text-[10px] text-muted-foreground">Student must reset password on first login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateStudent} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              {createError && (
                <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {createSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                  <input
                    type="text" required
                    value={newStudent.full_name}
                    onChange={e => setNewStudent(s => ({ ...s, full_name: e.target.value }))}
                    placeholder="e.g. Adnan Rahman"
                    className="form-input text-sm"
                    disabled={isCreating}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">University ID *</label>
                  <input
                    type="text" required
                    value={newStudent.university_id}
                    onChange={e => setNewStudent(s => ({ ...s, university_id: e.target.value }))}
                    placeholder="e.g. CSE-2021-001"
                    className="form-input text-sm font-mono uppercase"
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">University Email *</label>
                <input
                  type="email" required
                  value={newStudent.email}
                  onChange={e => setNewStudent(s => ({ ...s, email: e.target.value }))}
                  placeholder="student@university.edu"
                  className="form-input text-sm"
                  disabled={isCreating}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3 text-amber-400" />
                  Temporary Password *
                </label>
                <input
                  type="text" required minLength={8}
                  value={newStudent.password}
                  onChange={e => setNewStudent(s => ({ ...s, password: e.target.value }))}
                  placeholder="Min. 8 characters — student will change this"
                  className="form-input text-sm font-mono"
                  disabled={isCreating}
                />
                <p className="text-[10px] text-amber-400/80">⚠ Share this password securely with the student. They will be forced to set a new one.</p>
              </div>



              <div className="flex gap-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border border-border hover:bg-muted/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Create Account</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
