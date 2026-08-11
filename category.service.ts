import { Prisma, type Category } from "@prisma/client";
import type { Db } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import type { CategoryType, TransactionType } from "../lib/domain.js";
import { categoryTypeForTransaction } from "../lib/domain.js";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "../validators/category.validators.js";

export interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isDefault: boolean;
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type as CategoryType,
    color: category.color,
    icon: category.icon,
    isDefault: category.isDefault,
  };
}

export async function listCategories(
  db: Db,
  query: ListCategoriesQuery
): Promise<CategoryDto[]> {
  const categories = await db.category.findMany({
    where: query.type ? { type: query.type } : {},
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return categories.map(toCategoryDto);
}

export async function createCategory(
  db: Db,
  userId: string,
  input: CreateCategoryInput
): Promise<CategoryDto> {
  try {
    const category = await db.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon,
        isDefault: false,
      },
    });
    return toCategoryDto(category);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw Errors.conflict("Já existe uma categoria com esse nome");
    }
    throw err;
  }
}

/**
 * Busca uma categoria garantindo que ela existe. A RLS já impede ler categoria
 * de outro usuário — o `findUnique` simplesmente não encontra, e o 404 aqui é
 * a resposta correta (não revela se o id existe para outra conta).
 */
async function requireCategory(db: Db, id: string): Promise<Category> {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) throw Errors.notFound("Categoria não encontrada");
  return category;
}

export async function updateCategory(
  db: Db,
  id: string,
  input: UpdateCategoryInput
): Promise<CategoryDto> {
  await requireCategory(db, id);

  try {
    const category = await db.category.update({ where: { id }, data: input });
    return toCategoryDto(category);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw Errors.conflict("Já existe uma categoria com esse nome");
    }
    throw err;
  }
}

export async function deleteCategory(db: Db, id: string): Promise<void> {
  const category = await requireCategory(db, id);

  // Apagar uma categoria em uso deixaria lançamentos órfãos e distorceria o
  // histórico do usuário. Melhor recusar e explicar do que perder dado.
  const [transactionCount, recurringCount] = await Promise.all([
    db.transaction.count({ where: { categoryId: id, deletedAt: null } }),
    db.recurringTransaction.count({ where: { categoryId: id } }),
  ]);

  if (transactionCount > 0 || recurringCount > 0) {
    throw Errors.conflict(
      "Esta categoria está sendo usada em lançamentos. Altere-os antes de excluí-la."
    );
  }

  if (category.isDefault) {
    throw Errors.conflict("Categorias padrão não podem ser excluídas.");
  }

  await db.category.delete({ where: { id } });
}

/**
 * Valida que a categoria escolhida existe e é compatível com o tipo do
 * lançamento — impede, por exemplo, gravar um salário na categoria "Moradia".
 */
export async function assertCategoryMatchesType(
  db: Db,
  categoryId: string,
  transactionType: TransactionType
): Promise<Category> {
  const category = await requireCategory(db, categoryId);
  const expected = categoryTypeForTransaction(transactionType);

  if (category.type !== expected) {
    throw Errors.badRequest(
      expected === "income"
        ? "Escolha uma categoria de receita para este lançamento."
        : "Escolha uma categoria de despesa para este lançamento."
    );
  }

  return category;
}

/** Resolve uma categoria pelo nome canônico — usado pela classificação de extrato. */
export async function findCategoryByName(
  db: Db,
  name: string,
  type: CategoryType
): Promise<Category | null> {
  return db.category.findFirst({ where: { name, type } });
}
