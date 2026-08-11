export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  badRequest: (message = "Dados inválidos", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "Não autenticado") =>
    new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Sem permissão para acessar este recurso") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (message = "Recurso não encontrado") =>
    new AppError(404, "NOT_FOUND", message),
  conflict: (message = "Conflito de dados") => new AppError(409, "CONFLICT", message),
  unprocessable: (message = "Erro de validação", details?: unknown) =>
    new AppError(422, "UNPROCESSABLE_ENTITY", message, details),
  tooManyRequests: (message = "Muitas requisições. Tente novamente mais tarde.") =>
    new AppError(429, "TOO_MANY_REQUESTS", message),
  internal: (message = "Erro interno do servidor") =>
    new AppError(500, "INTERNAL_ERROR", message),
};
