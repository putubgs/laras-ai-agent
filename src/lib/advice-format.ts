/** Remove accidental markdown from model advice so UI stays plain (normal weight only). */
export function stripAdviceFormatting(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`+/g, "")
    .replace(/\r/g, "")
    .trim();
}
