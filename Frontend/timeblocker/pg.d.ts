declare module 'pg' {
  export interface QueryConfig {
    name?: string;
    text: string;
    values?: any[];
  }

  export interface QueryResult {
    rows: any[];
    rowCount: number;
  }

  export interface PoolConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query(queryConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export class Client {
    constructor(config?: PoolConfig);
    connect(): Promise<void>;
    query(queryConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
    end(): Promise<void>;
  }
}
