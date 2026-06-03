export function isArchivedDoctor(status: string): boolean {
  return status.trim().toLowerCase() === "9. archived";
}
