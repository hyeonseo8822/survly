import { resolveUploadUrl } from './uploadUrl';

export const getProfileStorageKey = (userId) => `survly-profile-${userId}`;

export const readLocalJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const readCachedProfile = (userId) => {
  if (!userId) {
    return null;
  }

  return readLocalJson(getProfileStorageKey(userId), null);
};

export const readCachedAvatarUrl = (userId) => {
  const cachedProfile = readCachedProfile(userId);
  return resolveUploadUrl(cachedProfile?.avatarUrl || '');
};

export const writeCachedProfile = (userId, profile) => {
  if (!userId) {
    return;
  }

  localStorage.setItem(getProfileStorageKey(userId), JSON.stringify(profile));
};

export const removeCachedProfile = (userId) => {
  if (!userId) {
    return;
  }

  localStorage.removeItem(getProfileStorageKey(userId));
};
