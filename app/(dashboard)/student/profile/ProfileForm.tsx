'use client';

import { useState, useRef } from 'react';
import { Camera, Save, Loader2, AlertTriangle, CheckCircle, Bell, BellOff, Volume2, VolumeX, Users, Trash2, Search, X, Mail, Phone, Shield, UserPlus, KeyRound, Eye, EyeOff, ShieldCheck, UserCheck, Calendar } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateProfile, deleteUserAccount, createStudentAccount, updateUserRole, changePassword, updateSemesterConfig } from '@/lib/actions/profile';
import { Profile } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { playNotificationChime } from '@/lib/utils/audio';

interface ProfileFormProps {
  profile: Profile;
  allProfiles?: Pick<Profile, 'id' | 'full_name' | 'university_id' | 'email' | 'phone' | 'role' | 'password_reset_required'>[];
  semesterConfig?: { total_weeks: number; start_date: string };
}

export function ProfileForm({ profile: initialProfile, allProfiles = [], semesterConfig }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.profile_pic_url);
  const [compressedAvatar, setCompressedAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    password: '', batch: '', department: '',
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
        
        setNewStudent({ full_name: '', email: '', university_id: '', password: '', batch: '', department: '' });
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

    setError(null);
    setSuccess(false);

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    try {
      // Set temporary local preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      // Compress image
      setIsPending(true);
      const options = {
        maxSizeMB: 0.5, // limit to 500KB
        maxWidthOrHeight: 400, // max 400x400px
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      setCompressedAvatar(compressedFile);
    } catch (err) {
      console.error('Image compression error:', err);
      setError('Failed to compress avatar image.');
    } finally {
      setIsPending(false);
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

    // Append compressed avatar if available
    if (compressedAvatar) {
      formData.set('avatar', compressedAvatar, compressedAvatar.name);
    }

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
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Avatar & Notifications */}
      <div className="flex flex-col gap-6">
        {/* Avatar Card */}
        <div className="glass-card p-6 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50 relative bg-accent">
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
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 transition-all shadow-md"
              aria-label="Upload photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
              disabled={isPending}
            />
          </div>

          <div>
            <h3 className="font-bold text-base text-foreground">{profile.full_name}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{profile.university_id}</p>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
            Notification Preferences
          </h3>

          {/* Toggle 1: Enable Notifs */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">In-App Notifications</span>
              <span className="text-[10px] text-muted-foreground">Receive real-time alerts</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !notifEnabled;
                setNotifEnabled(nextVal);
                if (nextVal) {
                  playNotificationChime();
                }
              }}
              disabled={isPending}
              className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                notifEnabled
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
              }`}
            >
              {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Manage Accounts Card (CR/Admin only) */}
        {(profile.role === 'cr' || profile.role === 'admin') && allProfiles.length > 0 && (
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Class Administration
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As a Class Representative, you can view, edit roles, and delete authorized student accounts for this batch.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(true); setCreateError(null); setCreateSuccess(null); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Create Student Account
              </button>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#34D399] border border-[#34D399]/20 hover:border-[#34D399]/40 bg-[#34D399]/10 hover:bg-[#34D399]/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#34D399]/5 cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#34D399]" />
                Manage Accounts ({accountsList.length})
              </button>
            </div>
          </div>
        )}

        {/* Semester Settings Card (CR/Admin only) */}
        {(profile.role === 'cr' || profile.role === 'admin') && (
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Semester Settings
            </h3>
            
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
                  Configure the total weeks and starting date for this semester's timeline.
                </p>
                
                <div className="flex flex-col gap-3 mt-2">
              {configError && (
                <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
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
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Right Column: Profile details form */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="glass-card p-6 md:p-8 flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
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
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
              Personal Information
            </h3>

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
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ''}
                  placeholder="e.g. +8801700000000"
                  className="form-input"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
              Contact & Social Profiles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="whatsapp" className="text-xs font-semibold text-foreground">
                  WhatsApp Number
                </label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  defaultValue={profile.whatsapp || ''}
                  placeholder="e.g. +8801700000000"
                  className="form-input"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="telegram_handle" className="text-xs font-semibold text-foreground">
                  Telegram Username
                </label>
                <div className="relative">
                  <input
                    id="telegram_handle"
                    name="telegram_handle"
                    type="text"
                    defaultValue={profile.telegram_handle || ''}
                    placeholder="username"
                    className="form-input pl-8"
                    disabled={isPending}
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold select-none">
                    @
                  </span>
                </div>
              </div>
            </div>
          </div>

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

        {/* ── Change Password Card ────────────────────────── */}
        <div className="glass-card p-6 md:p-8 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-foreground">Change Password</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Enter your current password to set a new one. Minimum 8 characters.
          </p>

          {cpError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
      </div>
    </form>

      {/* Manage Student Accounts Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-[#121214] border border-[#23262D] rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[#23262D] flex items-center justify-between flex-shrink-0 bg-[#1A1D24]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Manage Accounts
                  </h2>
                  <p className="text-xs text-slate-400">Total authorized students: {accountsList.length}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 md:p-6 border-b border-[#23262D] flex-shrink-0 bg-[#1A1D24]/20 flex flex-col gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students by name, ID, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10 bg-[#0E0F11] border-[#23262D] focus:border-primary/50"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#23262D]/60 -mx-4 md:-mx-6 px-4 md:px-6">
                <button
                  type="button"
                  onClick={() => setActiveAccountTab('verified')}
                  className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeAccountTab === 'verified'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-white'
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
                      : 'border-transparent text-slate-400 hover:text-white'
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
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No student accounts found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeAccountTab === 'pending'
                      ? 'No accounts are currently pending first-login activation'
                      : 'No verified accounts match your search'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Table Header (Desktop only) */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-[#23262D]/30">
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
                        className="bg-[#1A1D24]/40 border border-[#23262D]/60 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-all hover:bg-[#1A1D24]/70"
                      >
                        {/* Student Meta Info */}
                        <div className="col-span-1 md:col-span-4 flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 uppercase flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
                              {student.full_name}
                              {isSelf && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{student.university_id}</p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="col-span-1 md:col-span-3 flex flex-col gap-1.5 text-xs text-slate-400 min-w-0">
                          <a
                            href={`mailto:${student.email}`}
                            className="flex items-center gap-2 hover:text-white transition-colors truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </a>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{student.phone || 'No phone number'}</span>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="col-span-1 md:col-span-1 flex items-center md:justify-center justify-start">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              student.role === 'cr' || student.role === 'admin'
                                ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#6EE7B7]'
                                : 'bg-[#10b981]/10 border-[#10b981]/20 text-[#34d399]'
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
                        <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 border-t border-[#23262D]/40 pt-3 md:pt-0 md:border-0">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121214] border border-[#23262D] rounded-2xl max-w-lg w-full flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-[#23262D] flex items-center justify-between bg-[#1A1D24]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}>
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Create Student Account</h2>
                  <p className="text-[10px] text-slate-400">Student must reset password on first login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateStudent} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                  <label className="text-xs font-semibold text-slate-300">Full Name *</label>
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
                  <label className="text-xs font-semibold text-slate-300">University ID *</label>
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
                <label className="text-xs font-semibold text-slate-300">University Email *</label>
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
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Batch (optional)</label>
                  <input
                    type="text"
                    value={newStudent.batch}
                    onChange={e => setNewStudent(s => ({ ...s, batch: e.target.value }))}
                    placeholder="e.g. 2024"
                    className="form-input text-sm"
                    disabled={isCreating}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Department (optional)</label>
                  <input
                    type="text"
                    value={newStudent.department}
                    onChange={e => setNewStudent(s => ({ ...s, department: e.target.value }))}
                    placeholder="e.g. Computer Science"
                    className="form-input text-sm"
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-[#23262D]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-[#23262D] hover:bg-slate-800/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
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
