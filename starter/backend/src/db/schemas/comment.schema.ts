import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const commentsTable = sqliteTable('comments', {
  id: int().primaryKey({ autoIncrement: true }),
  content: text().notNull(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text(),
});

export type CommentRow = typeof commentsTable.$inferSelect;
