"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MashovClient = void 0;
exports.currentSchoolYear = currentSchoolYear;
exports.behaveEventKey = behaveEventKey;
exports.listSchools = listSchools;
const errors_1 = require("./errors");
const BASE_URL = "https://web.mashov.info/api/";
const APP_VERSION = "4.20250101";
const USER_AGENT = "Mozilla/5.0 (mashov-client)";
const DEFAULT_TIMEOUT_MS = 15_000;
/**
 * The school year as Mashov counts it: the calendar year it ends in.
 * The portal rolls over in August, ahead of September 1st.
 */
function currentSchoolYear(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "numeric",
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    return month >= 8 ? year + 1 : year;
}
/**
 * A stable identity for a behavior event. The portal exposes no event id, and
 * a teacher can edit the remark or justify the event later, so the key is the
 * lesson slot plus the event type, not the mutable fields.
 */
function behaveEventKey(event) {
    return [
        event.studentGuid,
        event.lessonDate.slice(0, 10),
        event.lesson,
        event.groupId,
        event.achvaCode,
    ].join("|");
}
async function doFetch(fetchImpl, url, init, timeoutMs) {
    try {
        return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    }
    catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new errors_1.MashovRequestError(`Mashov request failed: ${reason}`);
    }
}
/** Public catalogue of schools (no login needed): semel, name, available years. */
async function listSchools(options = {}) {
    const res = await doFetch(options.fetch ?? fetch, `${BASE_URL}schools`, { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    if (!res.ok) {
        throw new errors_1.MashovRequestError(`Mashov schools list failed (HTTP ${res.status})`, res.status);
    }
    const rows = (await res.json());
    return rows.map((row) => ({ semel: row.semel, name: row.name, years: row.years ?? [] }));
}
class MashovClient {
    semel;
    username;
    password;
    year;
    timeoutMs;
    fetchImpl;
    onSession;
    session;
    constructor(options) {
        this.semel = options.semel;
        this.username = options.username;
        this.password = options.password;
        this.year = options.year ?? currentSchoolYear();
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.fetchImpl = options.fetch ?? fetch;
        this.onSession = options.onSession;
        // A saved session from another school or year would silently read the wrong data.
        const saved = options.session;
        this.session = saved && saved.semel === this.semel && saved.year === this.year ? saved : null;
    }
    getSession() {
        return this.session;
    }
    /** Logs in with the password, replacing any current session. */
    async login() {
        const res = await doFetch(this.fetchImpl, `${BASE_URL}login`, {
            method: "POST",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json;charset=UTF-8",
                Origin: "https://web.mashov.info",
                Referer: "https://web.mashov.info/students/login",
                "User-Agent": USER_AGENT,
            },
            body: JSON.stringify({
                semel: this.semel,
                year: this.year,
                username: this.username,
                password: this.password,
                IsBiometric: false,
                appName: "info.mashov.students",
                apiVersion: APP_VERSION,
                appVersion: APP_VERSION,
                appBuild: APP_VERSION,
                deviceUuid: "chrome",
                devicePlatform: "chrome",
                deviceManufacturer: "mashov-client",
                deviceModel: "server",
                deviceVersion: "0.1.0",
            }),
        }, this.timeoutMs);
        if (res.status === 401 || res.status === 403) {
            const text = await res.text().catch(() => "");
            const reason = (res.headers.get("reason") ?? "").trim().toLowerCase();
            if (reason === "changepass" || /change password/i.test(text)) {
                throw new errors_1.MashovPasswordChangeRequiredError("Mashov requires a password change before logging in");
            }
            throw new errors_1.MashovAuthError("Mashov rejected the username, password, school or year");
        }
        if (!res.ok) {
            throw new errors_1.MashovRequestError(`Mashov login failed (HTTP ${res.status})`, res.status);
        }
        const csrfToken = res.headers.get("x-csrf-token");
        const cookie = res.headers
            .getSetCookie()
            .map((line) => line.split(";", 1)[0])
            .filter(Boolean)
            .join("; ");
        if (!csrfToken || !cookie) {
            throw new errors_1.MashovRequestError("Mashov login answered without a session");
        }
        const body = (await res.json().catch(() => ({})));
        const children = (body.accessToken?.children ?? [])
            .filter((child) => !!child.childGuid)
            .map((child) => ({
            childGuid: child.childGuid,
            privateName: child.privateName ?? "",
            familyName: child.familyName ?? "",
            classCode: child.classCode ?? "",
            classNum: Number(child.classNum ?? 0),
        }));
        this.session = {
            semel: this.semel,
            year: this.year,
            cookie,
            csrfToken,
            children,
            behaveDenied: body.accessToken?.schoolSettings?.denyStudentsBehave === true,
            createdAt: new Date().toISOString(),
        };
        await this.onSession?.(this.session);
        return this.session;
    }
    /** The parent's children at this school (logs in if there is no session yet). */
    async getChildren() {
        const session = this.session ?? (await this.login());
        return session.children;
    }
    /**
     * Behavior events for one child: absences, lateness, positive notes, missing
     * homework/equipment, with the teacher's remark when there is one.
     * `start` limits the result to events from that moment on.
     */
    async getBehaveEvents(childGuid, options = {}) {
        const query = options.start ? `?start=${encodeURIComponent(options.start.toISOString())}` : "";
        const rows = await this.get(`students/${encodeURIComponent(childGuid)}/behave${query}`);
        return Array.isArray(rows) ? rows : [];
    }
    /** Authenticated GET against any portal path, relative to `/api/`. */
    async get(path) {
        let session = this.session ?? (await this.login());
        let res = await this.send(path, session);
        if (res.status === 401) {
            // The saved session expired; one fresh login, then give up.
            session = await this.login();
            res = await this.send(path, session);
        }
        if (res.status === 401) {
            throw new errors_1.MashovAuthError("Mashov rejected a freshly created session");
        }
        if (res.status === 403) {
            throw new errors_1.MashovForbiddenError(`The school does not expose ${path.split("?")[0]}`);
        }
        if (!res.ok) {
            throw new errors_1.MashovRequestError(`Mashov GET ${path.split("?")[0]} failed (HTTP ${res.status})`, res.status);
        }
        return (await res.json());
    }
    send(path, session) {
        return doFetch(this.fetchImpl, `${BASE_URL}${path}`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                Cookie: session.cookie,
                "X-Csrf-Token": session.csrfToken,
                Referer: "https://web.mashov.info/students/main/dashboard",
                "User-Agent": USER_AGENT,
            },
        }, this.timeoutMs);
    }
}
exports.MashovClient = MashovClient;
