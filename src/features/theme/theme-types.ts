import type { Root } from "postcss";

export type SourceRange = { from: number; to: number };
export type ThemeDeclaration = SourceRange & {
  id: string;
  ruleId: string;
  property: string;
  value: string;
  important: boolean;
  valueFrom: number;
  valueTo: number;
  line: number;
  comment: string;
  note?: string;
  group?: { key: string; title: string; note: string };
};
export type ThemeRule = SourceRange & {
  id: string;
  selector: string;
  context: string[];
  line: number;
  declarations: ThemeDeclaration[];
  parentRuleId?: string;
};
export type ThemeImport = {
  id: string;
  url: string;
  conditions: string;
  line: number;
};
export type ThemeDiagnostic = { message: string; line: number; column: number };
export type ThemeAnalysis = {
  source: string;
  root: Root | null;
  rules: ThemeRule[];
  variables: ThemeDeclaration[];
  imports: ThemeImport[];
  metadata: Record<string, string>;
  diagnostic: ThemeDiagnostic | null;
};
export type ThemeProject = {
  id: string;
  fileName: string;
  original: string;
  text: string;
  exportedText: string;
  updatedAt: number;
};
