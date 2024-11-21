import { DB } from '@vlcn.io/crsqlite-wasm';

let db: DB | null = null;

export async function initDatabase() {
  if (db) return db;
  const sqlite = await import('@vlcn.io/crsqlite-wasm');
  const SQL = await sqlite.default();
  db = await SQL.open(':memory:');
  if (!db) throw new Error('Failed to initialize database');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_name TEXT NOT NULL,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER NOT NULL,
      total_reps INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movement_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      movement_name TEXT NOT NULL,
      reps_completed INTEGER NOT NULL,
      time_per_rep REAL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
    );

    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_name TEXT NOT NULL,
      record_type TEXT NOT NULL,
      value REAL NOT NULL,
      achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

interface DBExecResult {
  lastInsertRowId: number;
}

export async function logWorkout(data: {
  workoutName: string;
  durationSeconds: number;
  totalReps: number;
  movements: Array<{
    name: string;
    repsCompleted: number;
    timePerRep?: number;
  }>;
}) {
  const database = await initDatabase();
  if (!database) throw new Error('Database not initialized');
  
  await database.exec('BEGIN TRANSACTION');
  
  try {
    const result = await database.exec(`
      INSERT INTO workouts (workout_name, duration_seconds, total_reps)
      VALUES (?, ?, ?)
    `, [data.workoutName, data.durationSeconds, data.totalReps]) as unknown as DBExecResult;
    
    const workoutId = result.lastInsertRowId;
    
    for (const movement of data.movements) {
      await database.exec(`
        INSERT INTO movement_logs (workout_id, movement_name, reps_completed, time_per_rep)
        VALUES (?, ?, ?, ?)
      `, [workoutId, movement.name, movement.repsCompleted, movement.timePerRep || null]);
    }
    
    await database.exec('COMMIT');
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}

export async function getWorkoutHistory(limit = 10) {
  const database = await initDatabase();
  
  return database.execO(`
    SELECT 
      w.*,
      GROUP_CONCAT(ml.movement_name || ':' || ml.reps_completed) as movement_summary
    FROM workouts w
    LEFT JOIN movement_logs ml ON w.id = ml.workout_id
    GROUP BY w.id
    ORDER BY w.completed_at DESC
    LIMIT ?
  `, [limit]);
}

export async function getPersonalRecords(workoutName?: string) {
  const database = await initDatabase();
  
  const query = workoutName
    ? `SELECT * FROM personal_records WHERE workout_name = ? ORDER BY achieved_at DESC`
    : `SELECT * FROM personal_records ORDER BY achieved_at DESC`;
  
  const params = workoutName ? [workoutName] : [];
  return database.execO(query, params);
}

export async function setPersonalRecord(data: {
  workoutName: string;
  recordType: 'time' | 'reps' | 'weight';
  value: number;
}) {
  const database = await initDatabase();
  
  await database.exec(`
    INSERT INTO personal_records (workout_name, record_type, value)
    VALUES (?, ?, ?)
  `, [data.workoutName, data.recordType, data.value]);
}