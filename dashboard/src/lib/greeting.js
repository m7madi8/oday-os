/** Time-of-day greeting in Arabic (local device clock). */
export function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'صباح الخير';
  return 'مساء الخير';
}
