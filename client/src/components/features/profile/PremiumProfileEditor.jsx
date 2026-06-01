import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BadgeCheck, Banknote, Camera, CheckCircle2, Home, Landmark, Loader2, Mail, MapPin, Phone, ShieldCheck, UserRound, Wallet, X } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { getAvatarColorStyle, getAvatarInitial } from '../../../utils/avatar';
import { isValidIndianMobile, phoneInputProps, sanitizePhoneInput } from '../../../utils/phoneUtils';
import { switchRoleSmoothly } from '../../../utils/roleSwitch';

const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const studentFields = [
  { key: 'name', label: 'Full name', type: 'text', required: true },
  { key: 'mobileNumber', label: 'Mobile number', type: 'tel' },
  { key: 'city', label: 'Current city', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female', 'Other', 'Prefer not to say'] },
  { key: 'occupation', label: 'Stay type', type: 'text' },
];

const hostFields = [
  { key: 'name', label: 'Host name', type: 'text', required: true },
  { key: 'mobileNumber', label: 'Host contact number', type: 'tel' },
  { key: 'city', label: 'Hosting city', type: 'text' },
  { key: 'occupation', label: 'Hosting title', type: 'text' },
];

const normalizeTravellingText = (value, fallback = 'Room seeker') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /^(students?|travelling)$/i.test(text) ? 'Room seeker' : text;
};

const calculateCompletion = (form, isHost) => {
  const keys = isHost
    ? ['name', 'mobileNumber', 'city', 'occupation', 'bio', 'avatarUrl', 'paymentCollectionMode']
    : ['name', 'mobileNumber', 'city', 'gender', 'occupation', 'bio', 'avatarUrl'];
  return Math.round((keys.filter((key) => Boolean(form[key])).length / keys.length) * 100);
};

const ProfileSignal = ({ icon: Icon, label, value }) => (
  <div className="rr-profile-signal min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-200" />
      <span className="break-words [overflow-wrap:anywhere]">{label}</span>
    </div>
    <p className="mt-1 text-[clamp(11px,3vw,14px)] font-black leading-tight break-words [overflow-wrap:anywhere]">{value}</p>
  </div>
);

function PremiumProfileEditor({ mode = 'student' }) {
  const { user, updateUser, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const isHost = mode === 'landlord';
  const roleKey = isHost ? 'landlord' : 'student';
  const roleProfile = user?.roleProfiles?.[roleKey] || {};
  const [form, setForm] = useState({
    name: roleProfile.name || user?.name || '',
    mobileNumber: sanitizePhoneInput(roleProfile.mobileNumber || roleProfile.phone || user?.mobileNumber || user?.phone || ''),
    phone: sanitizePhoneInput(roleProfile.phone || roleProfile.mobileNumber || user?.phone || user?.mobileNumber || ''),
    city: roleProfile.city || user?.city || '',
    gender: roleProfile.gender || user?.gender || '',
    occupation: isHost
      ? (roleProfile.occupation || user?.occupation || '')
      : normalizeTravellingText(roleProfile.occupation || user?.occupation, ''),
    bio: roleProfile.bio || user?.bio || '',
    avatarUrl: roleProfile.avatarUrl || roleProfile.profilePicture || user?.avatarUrl || user?.profilePicture || '',
    profilePicture: roleProfile.profilePicture || roleProfile.avatarUrl || user?.profilePicture || user?.avatarUrl || '',
    paymentCollectionMode: roleProfile.paymentCollectionMode || '',
    offlinePaymentAllowed: Boolean(roleProfile.offlinePaymentAllowed),
    upiId: roleProfile.upiId || '',
    bankAccountHolder: roleProfile.bankAccountHolder || '',
    bankAccountNumber: roleProfile.bankAccountNumber || '',
    bankIfsc: roleProfile.bankIfsc || '',
    bankName: roleProfile.bankName || '',
    payoutNotes: roleProfile.payoutNotes || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  const profileFields = useMemo(() => (isHost ? hostFields : studentFields), [isHost]);
  const completion = useMemo(() => calculateCompletion(form, isHost), [form, isHost]);
  const currentProfilePhoto = form.avatarUrl || form.profilePicture || '';
  const accountEmail = user?.email || '';
  const verifications = user?.verifications || {};
  const emailVerified = Boolean(
    verifications.email
    || user?.verifiedEmails?.includes(accountEmail)
    || user?.verifiedEmails?.length > 0
    || user?.isGoogleUser
  );
  const phoneVerified = Boolean(
    verifications.phone
    || user?.verifiedPhone
    || isValidIndianMobile(form.mobileNumber || form.phone || '')
  );
  const verifiedCount = [
    emailVerified,
    phoneVerified,
    verifications.identity,
    isHost ? verifications.property : verifications.student,
  ].filter(Boolean).length;

  const updateField = (key, value) => {
    const nextValue = key === 'mobileNumber' || key === 'phone'
      ? sanitizePhoneInput(value)
      : value;
    setForm((prev) => ({
      ...prev,
      [key]: nextValue,
      ...(key === 'mobileNumber' ? { phone: nextValue } : {}),
      ...(key === 'avatarUrl' ? { profilePicture: nextValue } : {}),
    }));
  };

  const openPhotoPicker = () => {
    if (!uploadingPhoto) photoInputRef.current?.click();
  };

  const handleAvatarPhotoClick = () => {
    if (uploadingPhoto) return;
    if (currentProfilePhoto) {
      setPhotoPreviewOpen(true);
      return;
    }
    openPhotoPicker();
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Photo must be under 8 MB.');
      return;
    }

    const previousPhoto = form.avatarUrl || form.profilePicture || '';
    const previewUrl = URL.createObjectURL(file);
    const payload = new FormData();
    payload.append('image', file);

    const toastId = toast.loading('Uploading profile photo...');
    setUploadingPhoto(true);
    setForm((prev) => ({ ...prev, avatarUrl: previewUrl, profilePicture: previewUrl }));

    try {
      const uploadResponse = await api.post('/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = uploadResponse.data?.imageUrl || uploadResponse.data?.url || uploadResponse.data?.secure_url;
      if (!uploadedUrl) throw new Error('Upload did not return a photo URL.');

      setForm((prev) => ({ ...prev, avatarUrl: uploadedUrl, profilePicture: uploadedUrl }));
      const { data } = await api.put('/users/profile', {
        avatarUrl: uploadedUrl,
        profilePicture: uploadedUrl,
        profileRole: roleKey,
      });
      updateUser(data.user);
      toast.success('Profile photo updated.', { id: toastId });
    } catch (error) {
      setForm((prev) => ({ ...prev, avatarUrl: previousPhoto, profilePicture: previousPhoto }));
      toast.error(error.response?.data?.message || 'Could not upload photo.', { id: toastId });
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (form.bio.length > 500) {
      toast.error('Bio must be under 500 characters.');
      return;
    }
    if (form.mobileNumber && !isValidIndianMobile(form.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    const toastId = toast.loading('Saving profile...');
    try {
      setSaving(true);
      const { data } = await api.put('/users/profile', { ...form, profileRole: roleKey });
      updateUser(data.user);
      toast.success(`${isHost ? 'Host' : 'Room seeker'} profile updated.`, { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const verificationItems = [
    { key: 'email', label: 'Email', active: emailVerified },
    { key: 'phone', label: 'Phone', active: phoneVerified },
    { key: 'identity', label: 'Identity', active: verifications.identity },
    { key: isHost ? 'property' : 'student', label: isHost ? 'Property' : 'Profile', active: isHost ? verifications.property : verifications.student },
  ];

  const handleRoleSwitch = async () => {
    if (isHost) {
      await switchRoleSmoothly({
        role: 'student',
        path: '/profile',
        switchRole,
        navigate,
      });
      return;
    }

    if (user?.roles?.includes('Landlord')) {
      await switchRoleSmoothly({
        role: 'landlord',
        path: '/landlord/overview',
        switchRole,
        navigate,
      });
    } else {
      navigate('/list-your-room');
    }
  };

  const copy = {
    roleBadge: isHost ? '' : 'Room seeker profile',
    completionHint: isHost
      ? 'Only your host-side details update here.'
      : 'Only your room seeker details update here.',
    detailsIntro: isHost
      ? 'Used across your listings, booking approvals, and host inbox.'
      : 'Used across booking requests, saved rooms, and host chats.',
    bioPlaceholder: isHost
      ? 'Describe your hosting style, property standards, availability, and support process.'
      : 'Describe your travel/work routine, stay preferences, and move-in needs.',
    switchAction: isHost ? 'Open room seeker profile' : (user?.roles?.includes('Landlord') ? 'Open host dashboard' : 'List your room'),
  };

  return (
    <div className="rr-profile-editor relative min-h-screen overflow-hidden bg-slate-50 p-2 pb-28 text-light-text dark:bg-dark-bg dark:text-dark-text sm:p-4 md:p-6">
      <div className="pointer-events-none absolute -right-24 top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl dark:bg-brand/15" />
      <div className="pointer-events-none absolute -left-24 top-72 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/15" />

      <div className="relative mx-auto max-w-5xl">
        <section className="rr-profile-shell overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/70 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_30px_90px_-54px_rgba(0,0,0,0.95)] sm:rounded-[2rem]">
          <div className="rr-profile-hero relative min-h-[15.25rem] overflow-hidden bg-slate-950 px-4 pb-4 pt-5 text-white md:min-h-[18rem] md:px-8 md:pt-8">
            <div className="rr-profile-hero-glow absolute inset-0 bg-transparent" />
            <div className="rr-profile-hero-fade absolute inset-x-0 bottom-0 h-28 bg-transparent" />
            <div className="relative flex items-start justify-between gap-3">
              {copy.roleBadge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[clamp(9px,2.6vw,11px)] font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
                  <BadgeCheck className="h-3.5 w-3.5 text-cyan-100" />
                  {copy.roleBadge}
                </span>
              ) : <span />}
              <span className="rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[clamp(10px,2.8vw,12px)] font-black text-cyan-50 backdrop-blur-xl">
                {completion}% ready
              </span>
            </div>

            <div className="relative mt-9 flex items-end gap-3 md:mt-12 md:gap-5">
              <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleProfilePhotoChange} />
              <button
                type="button"
                onClick={handleAvatarPhotoClick}
                disabled={uploadingPhoto}
                aria-label={currentProfilePhoto ? 'Open profile photo' : 'Add profile photo'}
                className="relative flex h-[clamp(74px,22vw,112px)] w-[clamp(74px,22vw,112px)] flex-shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white/16 text-3xl font-black text-white ring-4 ring-white/24 shadow-[0_22px_52px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:ring-white/40 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 md:rounded-[1.8rem] md:text-4xl"
              >
                {currentProfilePhoto ? (
                  <img src={currentProfilePhoto} alt={form.name || 'Profile'} className="h-full w-full object-cover" />
                ) : (
                  <span className="rr-avatar-initial" style={getAvatarColorStyle(user?.id || user?._id || accountEmail, form.name || accountEmail)} aria-hidden="true">
                    {getAvatarInitial(form.name, accountEmail)}
                  </span>
                )}
                <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand shadow-lg md:bottom-2 md:right-2 md:h-8 md:w-8">
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin md:h-4 md:w-4" /> : <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                </span>
              </button>
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="max-w-full text-[clamp(22px,6.2vw,34px)] font-black leading-[0.98] tracking-[-0.03em] text-white break-words [overflow-wrap:anywhere]">{form.name || 'Complete your profile'}</h1>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[clamp(11px,3vw,13px)] font-bold text-white/78">
                  <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 rounded-full bg-black/18 px-2.5 py-1 backdrop-blur-lg">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-200" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{form.city || 'Add your city'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/18 px-2.5 py-1 backdrop-blur-lg">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-200" />
                    {verifiedCount}/4 verified
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ProfileSignal icon={Phone} label="Phone" value={form.mobileNumber ? 'Added' : 'Missing'} />
              <ProfileSignal icon={Mail} label="Email" value={accountEmail || 'Missing'} />
              <ProfileSignal icon={Home} label={isHost ? 'Host' : 'Profile'} value={isHost ? 'Landlord' : normalizeTravellingText(form.occupation, 'Room seeker')} />
              <ProfileSignal icon={ShieldCheck} label="Trust" value={`${verifiedCount}/4`} />
            </div>
          </div>

          <div className="px-4 py-4 md:px-8">
            <div className="rr-profile-completion rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 shadow-inner shadow-white/70 dark:border-white/10 dark:bg-slate-950/34 dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[clamp(12px,3.3vw,14px)] font-black">Profile completion</span>
                <span className="text-[clamp(18px,5vw,24px)] font-black text-brand">{completion}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
              <p className="mt-2 text-[clamp(11px,3vw,12px)] font-semibold text-light-muted dark:text-dark-muted">
                {copy.completionHint}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSave} className="rr-profile-card rounded-[1.6rem] border border-white/60 bg-white/78 p-4 shadow-[0_22px_70px_-54px_rgba(15,23,42,0.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_72px_-54px_rgba(0,0,0,0.9)] sm:rounded-[2rem] sm:p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="mb-2 inline-flex rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
                  Identity basics
                </span>
                <h2 className="text-[clamp(18px,5vw,24px)] font-black leading-tight tracking-[-0.025em]">Personal details</h2>
                <p className="mt-1 max-w-[30ch] text-[clamp(12px,3.3vw,14px)] font-semibold leading-5 text-light-muted dark:text-dark-muted">
                  {copy.detailsIntro}
                </p>
              </div>
              <button type="submit" disabled={saving} className="min-h-11 flex-shrink-0 rounded-2xl bg-brand px-4 text-[clamp(12px,3.2vw,14px)] font-black text-white shadow-[0_14px_34px_-22px_rgba(255,0,51,0.72)] transition active:scale-[0.97] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <label className="block sm:col-span-2">
                <span className="mb-2 flex items-center gap-2 text-[clamp(12px,3.1vw,14px)] font-black text-light-text dark:text-dark-text">
                  <Mail className="h-4 w-4 text-cyan-500" />
                  Email ID
                </span>
                <div className="flex min-h-12 flex-col gap-2 rounded-2xl border border-light-border bg-white/92 px-4 py-3 text-light-text shadow-sm dark:border-dark-border dark:bg-slate-950/50 dark:text-dark-text sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-[clamp(12px,3.2vw,14px)] font-bold leading-5 break-words [overflow-wrap:anywhere]">
                    {accountEmail || 'Email not available'}
                  </span>
                  <span className={`inline-flex flex-shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-black sm:self-center ${
                    emailVerified
                      ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}>
                    {emailVerified ? 'Verified' : 'Account'}
                  </span>
                </div>
              </label>
              {profileFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-[clamp(12px,3.1vw,14px)] font-black text-light-text dark:text-dark-text">{field.label}{field.required ? ' *' : ''}</span>
                  {field.type === 'select' ? (
                    <select value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} className="input-field min-h-12 rounded-2xl bg-white/92 dark:bg-slate-950/50">
                      {field.options.map((option) => <option key={option} value={option}>{option || 'Select'}</option>)}
                    </select>
                  ) : (
                    <input
                      value={form[field.key]}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      type={field.type}
                      className="input-field min-h-12 rounded-2xl bg-white/92 dark:bg-slate-950/50"
                      required={field.required}
                      placeholder={field.type === 'tel' ? '9876543210' : undefined}
                      {...(field.type === 'tel' ? phoneInputProps : {})}
                    />
                  )}
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">About you</span>
              <textarea
                value={form.bio}
                onChange={(event) => updateField('bio', event.target.value)}
                rows={5}
                maxLength={500}
                className="input-field resize-none rounded-2xl bg-white/92 dark:bg-slate-950/50"
                placeholder={copy.bioPlaceholder}
              />
              <span className="mt-1 block text-right text-xs font-semibold text-light-muted dark:text-dark-muted">{form.bio.length}/500</span>
            </label>

            {isHost && (
              <section className="rr-profile-card mt-6 rounded-3xl border border-light-border bg-light-bg p-5 dark:border-dark-border dark:bg-dark-sidebar">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Payout & collection</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                      Add where you want payouts and whether this host profile supports offline collection. Room-level payment preference is still controlled per listing.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-light-text dark:text-dark-text">
                      <Wallet className="h-4 w-4 text-cyan-500" />
                      Collection mode
                    </span>
                    <select value={form.paymentCollectionMode} onChange={(event) => updateField('paymentCollectionMode', event.target.value)} className="input-field">
                      <option value="">Select collection mode</option>
                      <option>Online escrow preferred</option>
                      <option>UPI / Bank transfer</option>
                      <option>Offline cash allowed</option>
                      <option>Online or Offline</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-light-text dark:text-dark-text">
                      <Banknote className="h-4 w-4 text-cyan-500" />
                      Offline collection
                    </span>
                    <button
                      type="button"
                      onClick={() => updateField('offlinePaymentAllowed', !form.offlinePaymentAllowed)}
                      className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-4 text-sm font-black transition ${
                        form.offlinePaymentAllowed
                          ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-200'
                          : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted'
                      }`}
                    >
                      <span>{form.offlinePaymentAllowed ? 'Allowed' : 'Disabled'}</span>
                      <span className={`h-5 w-9 rounded-full p-0.5 transition ${form.offlinePaymentAllowed ? 'bg-cyan-500' : 'bg-light-border dark:bg-dark-input'}`}>
                        <span className={`block h-4 w-4 rounded-full bg-white transition ${form.offlinePaymentAllowed ? 'translate-x-4' : ''}`} />
                      </span>
                    </button>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">UPI ID</span>
                    <input value={form.upiId} onChange={(event) => updateField('upiId', event.target.value)} type="text" className="input-field" placeholder="UPI ID" />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-light-text dark:text-dark-text">
                      <Landmark className="h-4 w-4 text-cyan-500" />
                      Bank name
                    </span>
                    <input value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} type="text" className="input-field" placeholder="Bank name" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">Account holder</span>
                    <input value={form.bankAccountHolder} onChange={(event) => updateField('bankAccountHolder', event.target.value)} type="text" className="input-field" placeholder="Account holder name" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">Account number</span>
                    <input value={form.bankAccountNumber} onChange={(event) => updateField('bankAccountNumber', event.target.value)} type="text" inputMode="numeric" className="input-field" placeholder="Bank account number" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">IFSC code</span>
                    <input value={form.bankIfsc} onChange={(event) => updateField('bankIfsc', event.target.value.toUpperCase())} type="text" className="input-field uppercase" placeholder="IFSC code" />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-2 block text-sm font-bold text-light-text dark:text-dark-text">Payout note</span>
                    <textarea
                      value={form.payoutNotes}
                      onChange={(event) => updateField('payoutNotes', event.target.value)}
                      rows={3}
                      maxLength={300}
                      className="input-field resize-none"
                      placeholder="Add private payout instructions for your host account."
                    />
                  </label>
                </div>
              </section>
            )}
          </form>

          <aside className="space-y-5">
            <div className="rr-profile-card rounded-[1.6rem] border border-white/60 bg-white/76 p-5 shadow-[0_20px_62px_-52px_rgba(15,23,42,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-black">Verification</h2>
              </div>
              <div className="mt-4 space-y-3">
                {verificationItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/85 p-3 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:shadow-none">
                    <span className="text-sm font-black">{item.label}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${item.active ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                      {item.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                      {item.active ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rr-profile-card rounded-[1.6rem] border border-white/60 bg-white/76 p-5 shadow-[0_20px_62px_-52px_rgba(15,23,42,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-200">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-black">Account actions</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={handleRoleSwitch}
                  className="btn-outline w-full"
                >
                  {copy.switchAction}
                </button>
                <button type="button" onClick={logout} className="btn-danger w-full">Log out</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {photoPreviewOpen && currentProfilePhoto && (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950/96 text-white" role="dialog" aria-modal="true" aria-label="Profile photo preview">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">{form.name || 'Profile photo'}</p>
              <p className="text-xs font-semibold text-white/60">Tap change to choose from gallery or WhatsApp images</p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoPreviewOpen(false)}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16 active:scale-95"
              aria-label="Close profile photo preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-4">
            <img
              src={currentProfilePhoto}
              alt={form.name || 'Profile'}
              className="max-h-full max-w-full rounded-[1.25rem] object-contain shadow-[0_28px_90px_-34px_rgba(0,0,0,0.9)]"
            />
          </div>
          <div className="flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={uploadingPhoto}
              className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-950 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploadingPhoto ? 'Uploading...' : 'Change photo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PremiumProfileEditor;
