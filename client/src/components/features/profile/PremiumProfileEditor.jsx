import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BadgeCheck, Banknote, Camera, CheckCircle2, Home, Landmark, MapPin, Phone, ShieldCheck, Sparkles, UserRound, Wallet } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../context/AuthContext';

const studentFields = [
  { key: 'name', label: 'Full name', type: 'text', required: true },
  { key: 'mobileNumber', label: 'Mobile number', type: 'tel' },
  { key: 'city', label: 'Current city', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['', 'Male', 'Female', 'Other', 'Prefer not to say'] },
  { key: 'occupation', label: 'Travelling type', type: 'text' },
  { key: 'avatarUrl', label: 'Profile photo URL', type: 'url' },
];

const hostFields = [
  { key: 'name', label: 'Host name', type: 'text', required: true },
  { key: 'mobileNumber', label: 'Host contact number', type: 'tel' },
  { key: 'city', label: 'Hosting city', type: 'text' },
  { key: 'occupation', label: 'Hosting title', type: 'text' },
  { key: 'avatarUrl', label: 'Host photo URL', type: 'url' },
];

const getInitial = (name) => (name || 'R').charAt(0).toUpperCase();

const normalizeTravellingText = (value, fallback = 'Travelling') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /^students?$/i.test(text) ? 'Travelling' : text;
};

const calculateCompletion = (form, isHost) => {
  const keys = isHost
    ? ['name', 'mobileNumber', 'city', 'occupation', 'bio', 'avatarUrl', 'paymentCollectionMode']
    : ['name', 'mobileNumber', 'city', 'gender', 'occupation', 'bio', 'avatarUrl'];
  return Math.round((keys.filter((key) => Boolean(form[key])).length / keys.length) * 100);
};

const ProfileSignal = ({ icon: Icon, label, value }) => (
  <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-200" />
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-1 truncate text-[clamp(12px,3.2vw,14px)] font-black leading-tight">{value}</p>
  </div>
);

function PremiumProfileEditor({ mode = 'student' }) {
  const { user, updateUser, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const isHost = mode === 'landlord';
  const roleKey = isHost ? 'landlord' : 'student';
  const roleProfile = user?.roleProfiles?.[roleKey] || {};
  const [form, setForm] = useState({
    name: roleProfile.name || user?.name || '',
    mobileNumber: roleProfile.mobileNumber || roleProfile.phone || user?.mobileNumber || user?.phone || '',
    phone: roleProfile.phone || roleProfile.mobileNumber || user?.phone || user?.mobileNumber || '',
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

  const profileFields = useMemo(() => (isHost ? hostFields : studentFields), [isHost]);
  const completion = useMemo(() => calculateCompletion(form, isHost), [form, isHost]);
  const userInitial = getInitial(form.name || user?.name);
  const verifications = user?.verifications || {};
  const verifiedCount = [
    verifications.email || user?.verifiedEmails?.length > 0,
    verifications.phone || Boolean(user?.verifiedPhone),
    verifications.identity,
    isHost ? verifications.property : verifications.student,
  ].filter(Boolean).length;

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'mobileNumber' ? { phone: value } : {}),
      ...(key === 'avatarUrl' ? { profilePicture: value } : {}),
    }));
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

    const toastId = toast.loading('Saving profile...');
    try {
      setSaving(true);
      const { data } = await api.put('/users/profile', { ...form, profileRole: roleKey });
      updateUser(data.user);
      toast.success(`${isHost ? 'Host' : 'Travelling'} profile updated.`, { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const verificationItems = [
    { key: 'email', label: 'Email', active: verifications.email || user?.verifiedEmails?.length > 0 },
    { key: 'phone', label: 'Phone', active: verifications.phone || Boolean(user?.verifiedPhone) },
    { key: 'identity', label: 'Identity', active: verifications.identity },
    { key: isHost ? 'property' : 'student', label: isHost ? 'Property' : 'Profile', active: isHost ? verifications.property : verifications.student },
  ];

  const handleRoleSwitch = () => {
    if (isHost) {
      switchRole('student');
      navigate('/profile');
      return;
    }

    if (user?.roles?.includes('Landlord')) {
      switchRole('landlord');
      navigate('/landlord/overview');
    } else {
      navigate('/list-your-room');
    }
  };

  const copy = {
    roleBadge: isHost ? '' : 'Travelling profile',
    completionHint: isHost
      ? 'Only your host-side details update here.'
      : 'Only your travelling-side details update here.',
    detailsIntro: isHost
      ? 'Used across your listings, booking approvals, and host inbox.'
      : 'Used across booking requests, saved rooms, and travelling inbox.',
    bioPlaceholder: isHost
      ? 'Describe your hosting style, property standards, availability, and support process.'
      : 'Describe your travel/work routine, stay preferences, and move-in needs.',
    switchAction: isHost ? 'Open travelling profile' : (user?.roles?.includes('Landlord') ? 'Open host dashboard' : 'List your room'),
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(6,182,212,0.12),transparent_28rem),linear-gradient(180deg,#f8fafc_0%,#eef6fb_46%,#f8fafc_100%)] p-2 pb-28 text-light-text dark:bg-[radial-gradient(circle_at_14%_0%,rgba(6,182,212,0.16),transparent_26rem),linear-gradient(180deg,#0f172a_0%,#111827_52%,#0f172a_100%)] dark:text-dark-text sm:p-4 md:p-6">
      <div className="pointer-events-none absolute -right-24 top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl dark:bg-brand/15" />
      <div className="pointer-events-none absolute -left-24 top-72 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/15" />

      <div className="relative mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/70 shadow-[0_28px_80px_-54px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_30px_90px_-54px_rgba(0,0,0,0.95)] sm:rounded-[2rem]">
          <div className={`relative min-h-[15.25rem] overflow-hidden px-4 pb-4 pt-5 text-white md:min-h-[18rem] md:px-8 md:pt-8 ${
            isHost
              ? 'bg-[linear-gradient(135deg,rgba(6,182,212,0.95)_0%,rgba(15,23,42,0.98)_45%,rgba(255,56,92,0.92)_100%)]'
              : 'bg-[linear-gradient(135deg,rgba(255,56,92,0.95)_0%,rgba(88,28,135,0.98)_46%,rgba(6,182,212,0.9)_100%)]'
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.28),transparent_18rem),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.2),transparent_16rem)]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/62 to-transparent" />
            <div className="relative flex items-start justify-between gap-3">
              {copy.roleBadge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-3 py-1.5 text-[clamp(9px,2.6vw,11px)] font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-100" />
                  {copy.roleBadge}
                </span>
              ) : <span />}
              <span className="rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-[clamp(10px,2.8vw,12px)] font-black text-cyan-50 backdrop-blur-xl">
                {completion}% ready
              </span>
            </div>

            <div className="relative mt-9 flex items-end gap-3 md:mt-12 md:gap-5">
              <div className="relative flex h-[clamp(74px,22vw,112px)] w-[clamp(74px,22vw,112px)] flex-shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white/16 text-3xl font-black text-white ring-4 ring-white/24 shadow-[0_22px_52px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl md:rounded-[1.8rem] md:text-4xl">
                {form.avatarUrl ? <img src={form.avatarUrl} alt={form.name || 'Profile'} className="h-full w-full object-cover" /> : userInitial}
                <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand shadow-lg md:bottom-2 md:right-2 md:h-8 md:w-8">
                  <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </span>
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="max-w-full truncate text-[clamp(22px,6.2vw,34px)] font-black leading-[0.98] tracking-[-0.03em] text-white">{form.name || 'Complete your profile'}</h1>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[clamp(11px,3vw,13px)] font-bold text-white/78">
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-black/18 px-2.5 py-1 backdrop-blur-lg">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cyan-200" />
                    <span className="truncate">{form.city || 'Add your city'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/18 px-2.5 py-1 backdrop-blur-lg">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-200" />
                    {verifiedCount}/4 verified
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <ProfileSignal icon={Phone} label="Phone" value={form.mobileNumber ? 'Added' : 'Missing'} />
              <ProfileSignal icon={Home} label={isHost ? 'Host' : 'Profile'} value={isHost ? 'Landlord' : normalizeTravellingText(form.occupation, 'Travelling')} />
              <ProfileSignal icon={ShieldCheck} label="Trust" value={`${verifiedCount}/4`} />
            </div>
          </div>

          <div className="px-4 py-4 md:px-8">
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 shadow-inner shadow-white/70 dark:border-white/10 dark:bg-slate-950/34 dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[clamp(12px,3.3vw,14px)] font-black">Profile completion</span>
                <span className="text-[clamp(18px,5vw,24px)] font-black text-brand">{completion}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-brand via-rose-400 to-cyan-400 transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
              <p className="mt-2 text-[clamp(11px,3vw,12px)] font-semibold text-light-muted dark:text-dark-muted">
                {copy.completionHint}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSave} className="rounded-[1.6rem] border border-white/60 bg-white/78 p-4 shadow-[0_22px_70px_-54px_rgba(15,23,42,0.9)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_72px_-54px_rgba(0,0,0,0.9)] sm:rounded-[2rem] sm:p-5 md:p-6">
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
              <button type="submit" disabled={saving} className="min-h-11 flex-shrink-0 rounded-2xl bg-gradient-to-r from-brand to-rose-500 px-4 text-[clamp(12px,3.2vw,14px)] font-black text-white shadow-[0_14px_34px_-22px_rgba(255,56,92,0.9)] transition active:scale-[0.97] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {profileFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-[clamp(12px,3.1vw,14px)] font-black text-light-text dark:text-dark-text">{field.label}{field.required ? ' *' : ''}</span>
                  {field.type === 'select' ? (
                    <select value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} className="input-field min-h-12 rounded-2xl bg-white/92 dark:bg-slate-950/50">
                      {field.options.map((option) => <option key={option} value={option}>{option || 'Select'}</option>)}
                    </select>
                  ) : (
                    <input value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} type={field.type} className="input-field min-h-12 rounded-2xl bg-white/92 dark:bg-slate-950/50" required={field.required} />
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
              <section className="mt-6 rounded-3xl border border-light-border bg-light-bg p-5 dark:border-dark-border dark:bg-dark-sidebar">
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

                <div className="grid gap-4 md:grid-cols-2">
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

                  <label className="block md:col-span-2">
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
            <div className="rounded-[1.6rem] border border-white/60 bg-white/76 p-5 shadow-[0_20px_62px_-52px_rgba(15,23,42,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045]">
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

            <div className="rounded-[1.6rem] border border-white/60 bg-white/76 p-5 shadow-[0_20px_62px_-52px_rgba(15,23,42,0.8)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.045]">
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
    </div>
  );
}

export default PremiumProfileEditor;
