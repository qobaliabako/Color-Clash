import { sqliteTable,text,integer,uniqueIndex,primaryKey } from 'drizzle-orm/sqlite-core';
export const counters=sqliteTable('mode_counters',{mode:text('mode').primaryKey(),number:integer('number').notNull()});
export const sessions=sqliteTable('sessions',{
 id:text('id').primaryKey(), clientId:text('client_id').notNull().unique(), tokenHash:text('token_hash').notNull(),
 mode:text('mode').notNull(),ordinal:integer('ordinal').notNull(),seed:integer('seed').notNull(),
 version:text('version').notNull(),knowledge:text('knowledge').notNull(),status:text('status').notNull().default('running'),
 started:text('started').notNull(),updated:text('updated').notNull(),metadata:text('metadata').notNull(),
 survey:text('survey'),demographics:text('demographics'),summary:text('summary'),saved:integer('saved').notNull().default(0)
},t=>[uniqueIndex('mode_ordinal_unique').on(t.mode,t.ordinal)]);
export const trials=sqliteTable('trials',{
 sessionId:text('session_id').notNull().references(()=>sessions.id,{onDelete:'cascade'}),
 seq:integer('seq').notNull(),trialId:text('trial_id').notNull(),payload:text('payload').notNull(),hash:text('hash').notNull()
},t=>[primaryKey({columns:[t.sessionId,t.seq]}),uniqueIndex('session_trial_unique').on(t.sessionId,t.trialId)]);
// No research records or upload credentials are retained after deletion.
export const deletedSessions=sqliteTable('deleted_sessions',{
 id:text('id').primaryKey(),clientId:text('client_id').notNull().unique(),deletedAt:text('deleted_at').notNull()
});
export const sessionAnalysis=sqliteTable('session_analysis',{
 sessionId:text('session_id').primaryKey().references(()=>sessions.id,{onDelete:'cascade'}),
 excluded:integer('excluded').notNull().default(0),reason:text('reason').notNull(),changedAt:text('changed_at').notNull()
});
export const exclusionHistory=sqliteTable('exclusion_history',{
 sequence:integer('sequence').primaryKey({autoIncrement:true}),
 sessionId:text('session_id').notNull().references(()=>sessions.id,{onDelete:'cascade'}),
 excluded:integer('excluded').notNull(),reason:text('reason').notNull(),changedAt:text('changed_at').notNull()
});
