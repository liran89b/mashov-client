export class MashovError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Wrong username/password/school/year. Retrying with the same input cannot help. */
export class MashovAuthError extends MashovError {}

/** The portal demands a new password before it will log this user in. */
export class MashovPasswordChangeRequiredError extends MashovAuthError {}

/** The school has switched this data off for parents (HTTP 403 on a data endpoint). */
export class MashovForbiddenError extends MashovError {}

/** Network failure, timeout, or an unexpected HTTP status. Worth retrying later. */
export class MashovRequestError extends MashovError {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}
