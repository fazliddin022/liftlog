import {
  pgTable, uuid, text, integer,
  boolean, timestamp, pgEnum, doublePrecision,
} from "drizzle-orm/pg-core";

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "other",
]);
export const equipmentEnum = pgEnum("equipment", [
  "machine", "barbell", "dumbbell", "cable", "bodyweight", "other",
]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exercises (har bir user o'zinikini boshqaradi)
export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  muscleGroup: muscleGroupEnum("muscle_group").default("other").notNull(),
  equipment: equipmentEnum("equipment").default("machine").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workout templates (split kunlari)
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  weekday: integer("weekday"), // 1 = Dushanba ... 7 = Yakshanba
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Template ichidagi mashqlar
export const templateExercises = pgTable("template_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").references(() => workoutTemplates.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").default(0).notNull(),
  targetSets: integer("target_sets").default(3).notNull(),
  repsMin: integer("reps_min").default(8).notNull(),
  repsMax: integer("reps_max").default(12).notNull(),
});

// Workout sessions (o'tkazilgan mashg'ulotlar)
export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  templateId: uuid("template_id").references(() => workoutTemplates.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  notes: text("notes"),
  bodyWeight: doublePrecision("body_weight"),
});

// Har bir set
export const sessionSets = pgTable("session_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => workoutSessions.id, { onDelete: "cascade" }).notNull(),
  exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  setNumber: integer("set_number").default(1).notNull(),
  weight: doublePrecision("weight").default(0).notNull(),
  reps: integer("reps").default(0).notNull(),
  isWarmup: boolean("is_warmup").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Body weight log
export const bodyWeights = pgTable("body_weights", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  weight: doublePrecision("weight").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  note: text("note"),
});

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type SessionSet = typeof sessionSets.$inferSelect;
export type BodyWeight = typeof bodyWeights.$inferSelect;