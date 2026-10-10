export class AccordClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code = "ACCORD_CLIENT_ERROR", status = 400, details?: any) {
    super(message);
    this.name = "AccordClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
