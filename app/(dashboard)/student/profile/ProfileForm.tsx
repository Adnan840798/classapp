'use client';

import { useState, useRef } from 'react';
import { Camera, Save, Loader2, AlertTriangle, CheckCircle, Bell, BellOff, Volume2, VolumeX, Users, Trash2, Search, X, Mail, Phone, Shield } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateProfile, updateUserRole, deleteUserAccount } from '@/lib/actions/profile';
import { Profile } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProfileFormProps {
  profile: Profile;
  allProfiles?: Pick<Profile, 'id' | 'full_name' | 'university_id' | 'email' | 'phone' | 'role'>[];
}

export function ProfileForm({ profile: initialProfile, allProfiles = [] }: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.profile_pic_url);
  const [compressedAvatar, setCompressedAvatar] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification toggles
  const [notifEnabled, setNotifEnabled] = useState(initialProfile.notif_enabled);
  const [notifSoundOn, setNotifSoundOn] = useState(initialProfile.notif_sound_on);

  // Manage Accounts states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [accountsList, setAccountsList] = useState(allProfiles);

  async function handleToggleRole(targetUser: typeof allProfiles[0]) {
    const newRole = targetUser.role === 'student' ? 'cr' : 'student';
    if (!confirm(`Are you sure you want to change ${targetUser.full_name}'s role to ${newRole.toUpperCase()}?`)) {
      return;
    }
    
    setActionPendingId(targetUser.id);
    try {
      const res = await updateUserRole(targetUser.id, newRole);
      if (res && res.error) {
        alert(res.error);
      } else {
        // Update local state
        setAccountsList(prev =>
          prev.map(acc => acc.id === targetUser.id ? { ...acc, role: newRole } : acc)
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update user role');
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

  const filteredAccounts = accountsList.filter((acc) => {
    const term = searchTerm.toLowerCase();
    return (
      acc.full_name.toLowerCase().includes(term) ||
      acc.university_id.toLowerCase().includes(term) ||
      acc.email.toLowerCase().includes(term) ||
      (acc.phone && acc.phone.includes(term))
    );
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
    formData.set('notif_sound_on', String(notifSoundOn));

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
              onClick={() => setNotifEnabled((prev) => !prev)}
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

          {/* Toggle 2: Notif Sound */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Notification Sound</span>
              <span className="text-[10px] text-muted-foreground">Play a tone on new updates</span>
            </div>
            <button
              type="button"
              onClick={() => setNotifSoundOn((prev) => !prev)}
              disabled={isPending || !notifEnabled}
              className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                notifSoundOn && notifEnabled
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
              }`}
            >
              {notifSoundOn && notifEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 rounded-xl text-sm font-semibold text-white border border-[#6366f1]/20 hover:border-[#6366f1]/40 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#6366f1]/5 cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#818cf8]" />
              Manage Accounts ({accountsList.length})
            </button>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="blood_group" className="text-xs font-semibold text-foreground">
                  Blood Group
                </label>
                <input
                  id="blood_group"
                  name="blood_group"
                  type="text"
                  defaultValue={profile.blood_group || ''}
                  placeholder="e.g. O+, A-"
                  className="form-input"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="address" className="text-xs font-semibold text-foreground">
                  Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  defaultValue={profile.address || ''}
                  placeholder="e.g. Dhaka, Bangladesh"
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="facebook_id" className="text-xs font-semibold text-foreground">
                Facebook Profile ID or URL
              </label>
              <input
                id="facebook_id"
                name="facebook_id"
                type="text"
                defaultValue={profile.facebook_id || ''}
                placeholder="e.g. john.doe"
                className="form-input"
                disabled={isPending}
              />
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
      </div>

      {/* Manage Student Accounts Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-[#070b19] border border-[#141b34] rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-[#141b34] flex items-center justify-between flex-shrink-0 bg-[#090e22]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(220 91% 58%), hsl(260 80% 60%))' }}>
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
            <div className="p-4 md:p-6 border-b border-[#141b34] flex-shrink-0 bg-[#090e22]/20">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students by name, ID, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10 bg-[#050712] border-[#141b34] focus:border-primary/50"
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
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">No student accounts found</p>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your search terms</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Table Header (Desktop only) */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-[#141b34]/30">
                    <div className="col-span-5">Student</div>
                    <div className="col-span-4">Contact Details</div>
                    <div className="col-span-1 text-center">Role</div>
                    <div className="col-span-2 text-right pr-2">Actions</div>
                  </div>

                  {filteredAccounts.map((student) => {
                    const isSelf = student.id === profile.id;
                    const initials = student.full_name ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

                    return (
                      <div
                        key={student.id}
                        className="bg-[#090e22]/40 border border-[#141b34]/60 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-all hover:bg-[#090e22]/70"
                      >
                        {/* Student Meta Info */}
                        <div className="col-span-1 md:col-span-5 flex items-center gap-3.5 min-w-0">
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
                        <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5 text-xs text-slate-400 min-w-0">
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
                                ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#818cf8]'
                                : 'bg-[#10b981]/10 border-[#10b981]/20 text-[#34d399]'
                            }`}
                          >
                            {student.role.toUpperCase()}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 border-t border-[#141b34]/40 pt-3 md:pt-0 md:border-0">
                          <div className="flex items-center gap-2 ml-auto md:ml-0">
                            {/* Toggle Role Button */}
                            {!isSelf && (
                              <button
                                type="button"
                                disabled={actionPendingId !== null}
                                onClick={() => handleToggleRole(student)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#141b34] hover:bg-slate-800 hover:text-white text-xs text-slate-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title={student.role === 'student' ? 'Promote to CR' : 'Demote to Student'}
                              >
                                Toggle Role
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
    </form>
  );
}
