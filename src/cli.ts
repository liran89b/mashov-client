/**
 * Manual check against a real account. Credentials come from the environment
 * only, never from arguments (which end up in shell history):
 *
 *   MASHOV_SEMEL=123456 MASHOV_USERNAME=... MASHOV_PASSWORD=... npm run try
 *   npm run try -- schools <part of the school name>
 */
import { MashovClient, listSchools } from "./index";

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "schools") {
    const needle = rest.join(" ").trim();
    const schools = await listSchools();
    for (const school of schools.filter((s) => !needle || s.name.includes(needle)).slice(0, 30)) {
      console.log(`${school.semel}\t${school.name}`);
    }
    return;
  }

  const { MASHOV_SEMEL, MASHOV_USERNAME, MASHOV_PASSWORD } = process.env;
  if (!MASHOV_SEMEL || !MASHOV_USERNAME || !MASHOV_PASSWORD) {
    console.error("Set MASHOV_SEMEL, MASHOV_USERNAME and MASHOV_PASSWORD");
    process.exitCode = 1;
    return;
  }

  const client = new MashovClient({
    semel: Number(MASHOV_SEMEL),
    username: MASHOV_USERNAME,
    password: MASHOV_PASSWORD,
  });
  const session = await client.login();
  console.log(`Logged in. Children: ${session.children.length}, behaveDenied: ${session.behaveDenied}`);

  for (const child of session.children) {
    const events = await client.getBehaveEvents(child.childGuid);
    console.log(`\n${child.privateName} (${child.classCode}${child.classNum}): ${events.length} events`);
    for (const event of events.slice(-10)) {
      const remark = event.remark ? ` - ${event.remark}` : "";
      console.log(
        `  ${event.lessonDate.slice(0, 10)} #${event.lesson} ${event.achvaName} | ${event.subject} | ${event.reporter}${remark}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(`${err.name}: ${err.message}`);
  process.exitCode = 1;
});
