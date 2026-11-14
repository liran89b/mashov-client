"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MashovRequestError = exports.MashovForbiddenError = exports.MashovPasswordChangeRequiredError = exports.MashovAuthError = exports.MashovError = void 0;
class MashovError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}
exports.MashovError = MashovError;
/** Wrong username/password/school/year. Retrying with the same input cannot help. */
class MashovAuthError extends MashovError {
}
exports.MashovAuthError = MashovAuthError;
/** The portal demands a new password before it will log this user in. */
class MashovPasswordChangeRequiredError extends MashovAuthError {
}
exports.MashovPasswordChangeRequiredError = MashovPasswordChangeRequiredError;
/** The school has switched this data off for parents (HTTP 403 on a data endpoint). */
class MashovForbiddenError extends MashovError {
}
exports.MashovForbiddenError = MashovForbiddenError;
/** Network failure, timeout, or an unexpected HTTP status. Worth retrying later. */
class MashovRequestError extends MashovError {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.MashovRequestError = MashovRequestError;
