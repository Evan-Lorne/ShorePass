import { z } from "zod";
export const draftSchema = z.object({
  revision: z.number().int().nonnegative(),
  answers: z.record(z.string().max(20000)).refine((x) => Object.keys(x).length <= 300),
  marked: z.array(z.string()).max(300),
  currentIndex: z.number().int().min(0).max(300),
  elapsed: z.number().min(0).max(10000000),
});
