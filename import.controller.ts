import type { Request, Response } from "express";
import { userScope } from "../middleware/withUserDb.js";
import { Errors } from "../lib/errors.js";
import {
  confirmImportSchema,
  updateImportRowSchema,
} from "../validators/import.validators.js";
import {
  confirmImport,
  createImport,
  discardImport,
  getImport,
  listImports,
  updateImportRow,
} from "../services/import.service.js";

export async function index(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const imports = await runDb((db) => listImports(db));
  res.status(200).json({ imports });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);

  const file = req.file;
  if (!file) throw Errors.badRequest("Nenhum arquivo foi enviado.");

  const result = await runDb((db) =>
    createImport(db, userId, {
      originalname: file.originalname,
      buffer: file.buffer,
      size: file.size,
    })
  );

  res.status(201).json(result);
}

export async function show(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const result = await runDb((db) => getImport(db, req.params.id));
  res.status(200).json(result);
}

export async function updateRow(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  const input = updateImportRowSchema.parse(req.body);
  const row = await runDb((db) =>
    updateImportRow(db, req.params.id, req.params.rowId, input)
  );
  res.status(200).json({ row });
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { userId, runDb } = userScope(req);
  const input = confirmImportSchema.parse(req.body ?? {});
  const result = await runDb((db) => confirmImport(db, userId, req.params.id, input));
  res.status(200).json(result);
}

export async function destroy(req: Request, res: Response): Promise<void> {
  const { runDb } = userScope(req);
  await runDb((db) => discardImport(db, req.params.id));
  res.status(204).send();
}
