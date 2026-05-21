/**
 * Base HTTP error with status code and machine-readable code.
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request") {
    super(400, "BAD_REQUEST", message);
    this.name = "BadRequestError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_SERVER_ERROR", message);
    this.name = "InternalServerError";
  }
}
