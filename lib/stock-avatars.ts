export const stockAvatars = [
  { id: "teal", label: "Портрет на бирюзовом фоне" },
  { id: "coral", label: "Портрет на коралловом фоне" },
  { id: "violet", label: "Портрет на сиреневом фоне" },
  { id: "gold", label: "Портрет на жёлтом фоне" },
  { id: "blue", label: "Портрет на синем фоне" },
  { id: "green", label: "Портрет на мятном фоне" },
  { id: "rose", label: "Портрет на розовом фоне" },
  { id: "amber", label: "Портрет на персиковом фоне" },
  { id: "plum", label: "Портрет на сливовом фоне" },
  { id: "azure", label: "Портрет на голубом фоне" },
] as const;

export function stockAvatarSource(id: typeof stockAvatars[number]["id"]) {
  return `/avatars/${id}.webp`;
}

export const avatarMaxBytes = 5 * 1024 * 1024;
export const avatarUploadLimit = 5;
