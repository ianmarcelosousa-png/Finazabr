import type { Db } from "../lib/prisma.js";
import { DEFAULT_INVESTMENT_PERCENTAGE } from "../lib/defaultCategories.js";
import type { UpdateSettingsInput } from "../validators/settings.validators.js";

export interface SettingsDto {
  investmentPercentage: number;
}

/**
 * As configurações são criadas no registro, mas o `upsert` garante que uma
 * conta antiga (ou uma criada antes deste campo existir) não quebre a tela.
 */
export async function getSettings(db: Db, userId: string): Promise<SettingsDto> {
  const settings = await db.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId, investmentPercentage: DEFAULT_INVESTMENT_PERCENTAGE },
  });

  return { investmentPercentage: settings.investmentPercentage };
}

/**
 * O percentual fica salvo na conta e vale para todos os meses seguintes (§9),
 * até o usuário alterá-lo de novo.
 */
export async function updateSettings(
  db: Db,
  userId: string,
  input: UpdateSettingsInput
): Promise<SettingsDto> {
  const settings = await db.userSettings.upsert({
    where: { userId },
    update: { investmentPercentage: input.investmentPercentage },
    create: { userId, investmentPercentage: input.investmentPercentage },
  });

  return { investmentPercentage: settings.investmentPercentage };
}
