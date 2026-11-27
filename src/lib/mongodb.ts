import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _ytMongo?: Promise<MongoClient> };

/** 共用連線（開發模式熱重載時不會重複建立連線） */
export function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("缺少 MONGODB_URI 環境變數");
  globalForMongo._ytMongo ??= new MongoClient(uri).connect();
  return globalForMongo._ytMongo;
}

export async function getDb() {
  return (await getMongoClient()).db();
}
