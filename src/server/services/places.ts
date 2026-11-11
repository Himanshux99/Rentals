import "server-only";
import { db } from "../db";

export function listCitiesWithAreas() {
  return db.city.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { areas: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] } },
  });
}
