export interface Criterion {
  name: string;
  max: number;
}

export interface Unit {
  id: string;
  subject: string;
  grade: string;
  name: string;
  plan_text?: string;
  overview?: string;
}

export interface Rubric {
  id: string;
  unit_id: string;
  criteria: Criterion[];
  version: number;
  locked: boolean;
}

export interface Student {
  id: string;
  section_id: string;
  name: string;
}

export interface MarksRow {
  id?: string;
  student_id: string;
  rubric_id: string;
  quarter_id: string;
  scores: Record<string, number> | null; // null = no submission
  submitted: boolean;
}

// What the generation engine receives: one student's full quarter picture
// across every unit, already consolidated.
export interface StudentQuarterRecord {
  student_name: string;
  units: {
    unit_name: string;
    criteria: Criterion[];
    scores: Record<string, number> | null;
  }[];
}

export interface GeneratedRemark {
  student_name: string;
  remark: string;
}