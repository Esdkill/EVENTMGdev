import { z } from "zod";
import { requestType, requestFields } from "./request-fields";

export const draftFields = z.strictObject({
  type: requestType.nullable(),
  purpose: requestFields.shape.purpose.nullable(),
  copies: z.number().int().min(1).max(3).nullable(),
  delivery: requestFields.shape.delivery.nullable(),
});

export type DraftFields = z.infer<typeof draftFields>;
export type DraftResult = { error: string } | { draft: DraftFields; demo: boolean };
