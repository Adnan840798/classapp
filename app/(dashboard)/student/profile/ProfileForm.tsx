'use client';

import { useState, useRef } from 'react';
import { Camera, Save, Loader2, AlertTriangle, CheckCircle, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { updateProfile } from '@/lib/actions/profile';
import { Profile } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile: initialProfile }: ProfileFormProps) {
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
    </form>
  );
}
