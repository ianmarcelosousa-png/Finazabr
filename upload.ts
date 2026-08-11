import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env.js";
import { Errors } from "../lib/errors.js";

const ALLOWED_EXTENSIONS = new Set(["csv", "txt", "ofx", "qfx", "pdf"]);

/**
 * Upload de extrato em memória, sem gravar nada em disco: o arquivo é lido,
 * convertido em linhas de staging e descartado. Não guardar o extrato bruto é
 * a escolha mais segura — é o documento mais sensível que o usuário envia.
 *
 * O limite de tamanho é aplicado pelo multer *durante* a leitura, então um
 * arquivo gigante é cortado no meio do upload, sem nunca ocupar memória
 * inteira. A extensão é só um primeiro filtro barato: o formato de verdade é
 * decidido pelo conteúdo em `detectFormat`.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
    fields: 5,
  },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.toLowerCase().split(".").pop() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      callback(Errors.badRequest("Envie um arquivo .csv, .ofx ou .pdf."));
      return;
    }
    callback(null, true);
  },
});

const single = upload.single("file");

/** Traduz os erros do multer para o formato de erro padrão da API. */
export function uploadStatement(req: Request, res: Response, next: NextFunction): void {
  single(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        const limitMb = Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024));
        next(Errors.badRequest(`O arquivo é maior que o limite de ${limitMb} MB.`));
        return;
      }
      next(Errors.badRequest("Não foi possível processar o envio do arquivo."));
      return;
    }

    if (err) {
      next(err);
      return;
    }

    if (!req.file) {
      next(Errors.badRequest("Nenhum arquivo foi enviado."));
      return;
    }

    next();
  });
}
