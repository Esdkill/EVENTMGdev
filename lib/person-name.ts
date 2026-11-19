export type StoredName = { firstName: string | null; lastName: string | null; patronymic: string | null };

export function nameParts(name: string, stored?: StoredName | null) {
  if (stored?.firstName && stored.lastName) {
    return { firstName: stored.firstName, lastName: stored.lastName, patronymic: stored.patronymic ?? "" };
  }

  const [first = "", second = "", ...rest] = name.trim().split(/\s+/);
  if (!rest.length) return { firstName: first, lastName: second, patronymic: "" };

  // Older accounts can have either surname-first or given-name-first display names.
  if (/(?:ович|евич|ич|овна|евна|ична|инична)$/iu.test(second)) {
    return { firstName: first, lastName: rest.join(" "), patronymic: second };
  }
  return { firstName: second, lastName: first, patronymic: rest.join(" ") };
}

export function fullName({ lastName, firstName, patronymic }: StoredName) {
  return [lastName, firstName, patronymic].filter(Boolean).join(" ");
}

export function nameInitials({ firstName, patronymic }: StoredName) {
  return [firstName, patronymic].flatMap(part => part ? [part.charAt(0).toUpperCase() + "."] : []).join(" ");
}
