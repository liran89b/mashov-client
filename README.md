# mashov-client

Unofficial TypeScript client for the Mashov (משו"ב) parent/student portal.
Zero runtime dependencies, Node 20+.

It covers what a parent-facing app needs first: login, the list of children,
and **behavior events** (absences, lateness, positive notes, missing homework
or equipment, with the teacher's remark).

Not affiliated with Mashov. The portal has no public API; this talks to the same
endpoints its own web app uses, so it can break without notice.

## Install

```bash
npm install github:liran89b/mashov-client#v0.1.0
```

The compiled `dist/` is committed, so installing needs no build step.

## Use

```ts
import { MashovClient, behaveEventKey, listSchools } from "mashov-client";

const schools = await listSchools();           // public, no login

const client = new MashovClient({
  semel: 123456,                               // school code
  username: process.env.MASHOV_USERNAME!,      // usually the parent's ID number
  password: process.env.MASHOV_PASSWORD!,
  session: savedSession,                       // optional, from a previous run
  onSession: (session) => save(session),       // called after each login
});

for (const child of await client.getChildren()) {
  const events = await client.getBehaveEvents(child.childGuid);
  for (const event of events) {
    console.log(behaveEventKey(event), event.achvaName, event.subject, event.remark);
  }
}
```

- A saved session is reused until the portal answers 401, then the client logs
  in once more and retries. Persist the session to avoid a login per run.
- The portal gives events no id. `behaveEventKey` builds a stable one from the
  lesson slot and event type, for de-duplication.
- `client.get<T>(path)` calls any other authenticated portal path.

## Errors

| Error | Meaning |
|---|---|
| `MashovAuthError` | Wrong username, password, school or year. Do not retry. |
| `MashovPasswordChangeRequiredError` | The portal demands a new password first. |
| `MashovForbiddenError` | The school switched this data off for parents. |
| `MashovRequestError` | Network, timeout or unexpected status. Retry later. |

## Password login

The client logs in with a username and password. A parent who normally enters
with an SMS code can set a password on the portal's own
[password recovery page](https://web.mashov.info/students/recover).

## Try it against a real account

```bash
npm install && npm run build
npm run try -- schools <part of the school name>
cp .env.example .env   # fill in, then:
npm run try
```

Credentials are read from the environment or a local, git-ignored `.env` only.

## Credits

Protocol details were learned from these projects:
[NirBY/ha-mashov](https://github.com/NirBY/ha-mashov),
[t0mer/pymashov](https://github.com/t0mer/pymashov),
[mitekk/mashov](https://github.com/mitekk/mashov).

MIT license.
