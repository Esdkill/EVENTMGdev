import { z } from "zod";

export const externalHttpsUrl = z.string().trim().max(600).refine(value => {
  if (!URL.canParse(value)) return false;
  const { protocol, username, password } = new URL(value);
  return protocol === "https:" && !username && !password;
}).transform(value => new URL(value).href);
