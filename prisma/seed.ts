import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../lib/db";
import { demoNews } from "../lib/demo-news";
import { demoPassword, demoStudents } from "../lib/demo";
import { fullName } from "../lib/person-name";
import { seedDemoActivity } from "./demo-activity-seed";
import { seedAcademicData } from "./stage3-seed";
import { seedSchedule } from "./schedule-seed";

const staff = { username: "irina", firstName: "Ирина", patronymic: "Сергеевна", lastName: "Белова" } as const;
const fixturePassword = (username: string) => username === staff.username ? process.env.DEMO_STAFF_PASSWORD : demoPassword(username);

const staffOnly = process.argv.includes("--staff-only");

async function seed() {
  const fixtures = staffOnly ? [staff] : [...demoStudents, staff];

  for (const fixture of fixtures) {
    const password = fixturePassword(fixture.username);
    if (!password || password.length < 8) {
      throw new Error(`Задайте пароль для ${fixture.username} длиной от 8 символов.`);
    }
  }

  await db.$transaction(async (tx) => {
    if (staffOnly) {
      const existing = await tx.user.findUnique({
        where: { username: staff.username },
        select: { role: true },
      });
      if (existing?.role === "staff") return;
      if (existing) throw new Error(`Логин ${staff.username} уже занят.`);
    } else {
      await tx.studyGroup.createMany({ data: demoStudents.map(student => ({ code: student.group })), skipDuplicates: true });
      await seedSchedule(tx);
    }
    for (const fixture of fixtures) {
      const profile = "group" in fixture
        ? {
          group: fixture.group, year: fixture.year, faculty: "Факультет управления", program: "Бизнес-информатика",
          firstName: fixture.firstName, lastName: fixture.lastName, patronymic: fixture.patronymic,
        }
        : null;
      const values = {
        name: profile ? fullName(fixture) : `${fixture.firstName} ${fixture.patronymic} ${fixture.lastName}`,
        staffPatronymic: profile ? null : fixture.patronymic,
        email: `${fixture.username}@deanery.example`,
        role: profile ? "student" : "staff",
        isDemo: Boolean(profile),
        displayUsername: fixture.username,
      };
      const user = await tx.user.upsert({
        where: { username: fixture.username },
        create: { id: randomUUID(), username: fixture.username, ...values },
        update: values,
      });
      if (profile) {
        await tx.studentProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...profile },
          update: profile,
        });
      }

      if (fixture.username !== staff.username) await seedAcademicData(tx, fixture.username, user.id);

      const account = await tx.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      const password = await hashPassword(fixturePassword(fixture.username)!);
      if (account) {
        await tx.account.update({ where: { id: account.id }, data: { password } });
      } else {
        await tx.account.create({
          data: { id: randomUUID(), accountId: user.id, userId: user.id, providerId: "credential", password },
        });
      }
    }
    if (!staffOnly) {
      await seedDemoActivity(tx);
      await tx.bulletin.upsert({ where: { id: demoNews.id }, create: demoNews, update: {} });
    }
  });
}

seed()
  .then(() => console.log(staffOnly
    ? `Учётная запись сотрудника ${staff.username} готова.`
    : "Аккаунт сотрудника, два демо-аккаунта студентов, заявки и переписка готовы."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
