export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceStudent {
  id: string;
  firstName: string;
  lastName: string;
  catchupHours: number;
  absences: number;
  status: AttendanceStatus;
  arrival: string;
  departure: string;
  duration: number;
  comment: string;
  missedHours: number;
  addToCatchup: boolean;
}

export const ATTENDANCE_SESSION = {
  date: '21/09/2026',
  start: '08:00',
  end: '12:00',
  promotion: 'TP ECSR 2026–2027',
  title: 'Les intersections et les priorités',
  trainer: 'Yanis Morel',
} as const;

export const ATTENDANCE_STUDENTS: AttendanceStudent[] = [
  { id: 's1', firstName: 'Sam', lastName: 'Fokam', catchupHours: 4, absences: 1, status: 'present', arrival: '08:00', departure: '12:00', duration: 4, comment: '', missedHours: 0, addToCatchup: false },
  { id: 's2', firstName: 'Julie', lastName: 'Moreau', catchupHours: 14, absences: 3, status: 'late', arrival: '08:25', departure: '12:00', duration: 3.5, comment: 'Retard transport', missedHours: 0.5, addToCatchup: true },
  { id: 's3', firstName: 'Marc', lastName: 'Girard', catchupHours: 0, absences: 0, status: 'present', arrival: '08:00', departure: '12:00', duration: 4, comment: '', missedHours: 0, addToCatchup: false },
  { id: 's4', firstName: 'Léa', lastName: 'Perrin', catchupHours: 12, absences: 2, status: 'late', arrival: '08:30', departure: '12:00', duration: 3.5, comment: '', missedHours: 0.5, addToCatchup: true },
  { id: 's5', firstName: 'Karim', lastName: 'Benali', catchupHours: 2, absences: 1, status: 'absent', arrival: '08:00', departure: '12:00', duration: 0, comment: '', missedHours: 4, addToCatchup: true },
  { id: 's6', firstName: 'Nadia', lastName: 'Chevalier', catchupHours: 7, absences: 2, status: 'excused', arrival: '08:00', departure: '12:00', duration: 0, comment: '', missedHours: 0, addToCatchup: false },
  { id: 's7', firstName: 'Thomas', lastName: 'Roussel', catchupHours: 18, absences: 4, status: 'present', arrival: '08:00', departure: '12:00', duration: 4, comment: '', missedHours: 0, addToCatchup: false },
  { id: 's8', firstName: 'Chloé', lastName: 'Marchand', catchupHours: 0, absences: 0, status: 'present', arrival: '08:00', departure: '12:00', duration: 4, comment: '', missedHours: 0, addToCatchup: false },
  { id: 's9', firstName: 'Mehdi', lastName: 'Amrani', catchupHours: 3, absences: 1, status: 'present', arrival: '08:00', departure: '12:00', duration: 4, comment: '', missedHours: 0, addToCatchup: false },
];
