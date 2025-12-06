declare module 'acorn' {
  export interface Node {
    type: string;
    start: number;
    end: number;
  }

  export interface Program extends Node {
    type: 'Program';
    body: any[];
    sourceType: string;
  }

  export interface ParseOptions {
    ecmaVersion?: number | 'latest';
    sourceType?: 'script' | 'module';
    allowReturnOutsideFunction?: boolean;
    allowImportExportEverywhere?: boolean;
    allowSuperOutsideMethod?: boolean;
    locations?: boolean;
  }

  export function parse(input: string, opts?: ParseOptions): Program;
}
