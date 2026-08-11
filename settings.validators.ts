import { z } from "zod";

export const updateSettingsSchema = z.object({
  /**
   * Percentual da receita destinado a investir (§9). Inteiro de 0 a 100 —
   * qualquer valor fora disso produziria um card sem sentido.
   */
  investmentPercentage: z
    .number()
    .int("O percentual deve ser um número inteiro")
    .min(0, "O percentual deve estar entre 0 e 100")
    .max(100, "O percentual deve estar entre 0 e 100"),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
