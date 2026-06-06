/**
 * Migrates data from legacy `omq_db` (XAMPP/phpMyAdmin dump) into `umq_platform` (Prisma schema).
 * Run after: prisma migrate deploy && import of omq_db.sql
 */
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";

const LEGACY_URL =
  process.env.LEGACY_DATABASE_URL ?? "mysql://root@127.0.0.1:3306/omq_db";

function parseMysqlUrl(url: string) {
  const u = new URL(url.replace(/^mysql:\/\//, "http://"));
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username || "root"),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "") || "omq_db",
  };
}

async function main() {
  const prisma = new PrismaClient();
  const legacy = await mysql.createConnection(parseMysqlUrl(LEGACY_URL));

  try {
    const [rows] = await legacy.query<
      {
        setting_key: string;
        setting_value: string | null;
        description: string | null;
      }[]
    >(
      "SELECT setting_key, setting_value, description FROM general_settings ORDER BY id",
    );

    for (const row of rows) {
      await prisma.setting.upsert({
        where: { key: row.setting_key },
        update: {
          value: {
            value: row.setting_value,
            description: row.description,
          },
          group: "general",
        },
        create: {
          key: row.setting_key,
          value: {
            value: row.setting_value,
            description: row.description,
          },
          group: "general",
        },
      });
    }

    console.log(
      `Migrated ${rows.length} setting(s) from omq_db.general_settings → settings.`,
    );
  } finally {
    await legacy.end();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
