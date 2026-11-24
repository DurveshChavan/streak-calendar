export type Mark = 't' | 'x'
export type Marks = Record<string, Mark>
export interface Habit { id: string; name: string; marks: Marks }
export interface Doc { habits: Habit[]; cur: string; notes: Record<string, string>; theme: 'light' | 'dark' }
