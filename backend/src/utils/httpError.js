// Error with an HTTP status. The central error handler always sends `message`
// to the client for these errors, including 502/503 from external services.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
export const unavailable = (message) => new HttpError(503, message);
