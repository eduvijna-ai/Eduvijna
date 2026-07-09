/**
 * Worksheet types — mirrors Quiz-React src/types/worksheet.ts
 */

export interface WorksheetQuestionResult {
  id: number;
  section: string;
  isCorrect: boolean;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
}

export interface WorksheetEvaluateResponse {
  success: boolean;
  results: WorksheetQuestionResult[];
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  message: string;
  processing_time_ms?: number;
}

export type WorksheetSectionKey =
  | 'Section_A_MCQ'
  | 'Section_B_Fill_in_the_Blank'
  | 'Section_C_True_False'
  | 'Section_D_Short_Questions'
  | 'Section_F_Long_Questions'
  | 'Section_E_Matching';

export type WorksheetAnswers = Partial<Record<WorksheetSectionKey, Record<number, string>>>;

export interface WorksheetDataShape {
  Metadata: {
    Class: string;
    Subject: string;
    Lesson: string;
    Difficulty: string;
    Focus_Instructions?: string;
  };
  Worksheet: {
    Section_A_MCQ?: Array<{ id: number; question: string; options: string[] }>;
    Section_B_Fill_in_the_Blank?: Array<{ id: number; question: string }>;
    Section_C_True_False?: Array<{ id: number; question: string }>;
    Section_D_Short_Questions?: Array<{ id: number; question: string }>;
    Section_F_Long_Questions?: Array<{ id: number; question: string }>;
    Section_E_Matching?: {
      Instructions?: string;
      Pairs?: Array<{ id?: number; term?: string; left?: string; definition?: string; right?: string }>;
    };
  };
  AnswerKey?: Record<string, unknown>;
  Explanations?: Record<string, unknown>;
}

export interface WorksheetResponseShape {
  success?: boolean;
  WorksheetData: WorksheetDataShape;
  message?: string;
}
