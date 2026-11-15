import type { MashovBehaveEvent, MashovChild, MashovClientOptions, MashovSchool, MashovSession } from "./types";
/** A UUID-shaped id that is the same every time for one school login. */
export declare function stableDeviceUuid(semel: number, username: string): string;
/**
 * The school year as Mashov counts it: the calendar year it ends in.
 * The portal rolls over in August, ahead of September 1st.
 */
export declare function currentSchoolYear(now?: Date): number;
/**
 * A stable identity for a behavior event. The portal exposes no event id, and
 * a teacher can edit the remark or justify the event later, so the key is the
 * lesson slot plus the event type, not the mutable fields.
 */
export declare function behaveEventKey(event: MashovBehaveEvent): string;
/** Public catalogue of schools (no login needed): semel, name, available years. */
export declare function listSchools(options?: {
    fetch?: typeof fetch;
    timeoutMs?: number;
}): Promise<MashovSchool[]>;
export declare class MashovClient {
    private readonly semel;
    private readonly username;
    private readonly password;
    private readonly year;
    private readonly timeoutMs;
    private readonly fetchImpl;
    private readonly onSession?;
    private readonly deviceUuid;
    private session;
    /** Cookies from the last session, sent on login so the portal knows this device. */
    private priorCookie;
    constructor(options: MashovClientOptions);
    getSession(): MashovSession | null;
    /** Logs in with the password, replacing any current session. */
    login(): Promise<MashovSession>;
    /** The parent's children at this school (logs in if there is no session yet). */
    getChildren(): Promise<MashovChild[]>;
    /**
     * Behavior events for one child: absences, lateness, positive notes, missing
     * homework/equipment, with the teacher's remark when there is one.
     * `start` limits the result to events from that moment on.
     */
    getBehaveEvents(childGuid: string, options?: {
        start?: Date;
    }): Promise<MashovBehaveEvent[]>;
    /** Authenticated GET against any portal path, relative to `/api/`. */
    get<T>(path: string): Promise<T>;
    /** Rolling cookies the portal sets mid-session are kept and persisted. */
    private absorbCookies;
    private send;
}
