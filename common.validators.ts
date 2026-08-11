import { z } from "zod";
import { DATE_PATTERN, MONTH_PATTERN } from "../lib/dates.js";

export const monthSchema = z
  .string()
  .regex(MONTH_PATTERN, "Mês deve estar no formato AAAA-MM");

export const dateOnlySchema = z
  .string()
  .regex(DATE_PATTERN, "Data deve estar no formato AAAA-MM-DD");

export const cuidSchema = z.string().min(1, "Identificador é obrigatório").max(64);

/**
 * Dinheiro trafega e é armazenado em centavos, sempre inteiro positivo — o
 * sinal é dado pelo tipo do lançamento, nunca pelo valor. Teto de R$ 1 bilhão
 * evita overflow do Int do Postgres e entradas absurdas.
 */
export const amountCentsSchema = z
  .number()
  .int("Valor deve ser um número inteiro de centavos")
  .positive("Valor deve ser maior que zero")
  .max(100_000_000_000, "Valor acima do limite permitido");

export const descriptionSchema = z
  .string()
  .trim()
  .min(1, "Descrição é obrigatória")
  .max(200, "Descrição deve ter no máximo 200 caracteres");

export const dayOfMonthSchema = z
  .number()
  .int()
  .min(1, "Dia deve estar entre 1 e 31")
  .max(31, "Dia deve estar entre 1 e 31");

/** Cor em hex (#rgb ou #rrggbb) — evita injetar CSS arbitrário via categoria. */
export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor deve ser um hexadecimal válido");

/**
 * Nome de ícone do lucide-react. Restrito a PascalCase alfanumérico porque o
 * valor é usado para procurar um componente pelo nome no front-end.
 */
export const iconNameSchema = z
  .string()
  .regex(/^[A-Z][A-Za-z0-9]{0,39}$/, "Ícone inválido");
