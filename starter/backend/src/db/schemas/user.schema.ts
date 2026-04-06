import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  password: text().notNull(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text(),
});

export type UserRow = typeof usersTable.$inferSelect;
