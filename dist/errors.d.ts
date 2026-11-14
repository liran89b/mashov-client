export declare class MashovError extends Error {
    constructor(message: string);
}
/** Wrong username/password/school/year. Retrying with the same input cannot help. */
export declare class MashovAuthError extends MashovError {
}
/** The portal demands a new password before it will log this user in. */
export declare class MashovPasswordChangeRequiredError extends MashovAuthError {
}
/** The school has switched this data off for parents (HTTP 403 on a data endpoint). */
export declare class MashovForbiddenError extends MashovError {
}
/** Network failure, timeout, or an unexpected HTTP status. Worth retrying later. */
export declare class MashovRequestError extends MashovError {
    readonly status?: number | undefined;
    constructor(message: string, status?: number | undefined);
}
