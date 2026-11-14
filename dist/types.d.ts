export interface MashovSchool {
    semel: number;
    name: string;
    years: number[];
}
export interface MashovChild {
    childGuid: string;
    privateName: string;
    familyName: string;
    classCode: string;
    classNum: number;
}
/**
 * Everything needed to keep calling the API without logging in again.
 * Plain JSON, safe to persist (treat it as a secret: it is a live login).
 */
export interface MashovSession {
    semel: number;
    year: number;
    cookie: string;
    csrfToken: string;
    children: MashovChild[];
    /** True when the school hides behavior data from parents/students. */
    behaveDenied: boolean;
    createdAt: string;
}
/** One row of `GET /api/students/{guid}/behave`, as the portal returns it. */
export interface MashovBehaveEvent {
    studentGuid: string;
    eventCode: number;
    /** -1 = not justified. */
    justified: number;
    lessonId: number;
    reporterGuid: string;
    /** When the teacher recorded it, local Israel time, no zone suffix. */
    timestamp: string;
    groupId: number;
    lessonType: number;
    /** Period number within the day. */
    lesson: number;
    /** Date of the lesson, zero time, no zone suffix. */
    lessonDate: string;
    achvaCode: number;
    /** Hebrew name of the event type ("חיסור", "חיזוק חיובי", ...). */
    achvaName: string;
    achvaAval: number;
    justificationId: number;
    justification: string;
    /** Teacher's display name. */
    reporter: string;
    subject: string;
    /** Free-text note from the teacher, only on some events. */
    remark?: string;
}
export interface MashovClientOptions {
    semel: number;
    username: string;
    password: string;
    /** School year as Mashov counts it (the year it ends in). Defaults to the current one. */
    year?: number;
    /** A session saved earlier; used until the portal rejects it. */
    session?: MashovSession;
    /** Called after every successful login, so the caller can persist the session. */
    onSession?: (session: MashovSession) => void | Promise<void>;
    timeoutMs?: number;
    fetch?: typeof fetch;
}
