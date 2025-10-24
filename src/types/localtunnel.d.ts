/**
 * Type definitions for localtunnel compatible with ESM/Bundler moduleResolution
 * Based on @types/localtunnel but adapted for ESM
 */
declare module 'localtunnel' {
  export interface TunnelConfig {
    port?: number;
    host?: string;
    subdomain?: string;
    local_host?: string;
    local_https?: boolean;
    local_cert?: string;
    local_key?: string;
    local_ca?: string;
    allow_invalid_cert?: boolean;
  }

  export interface Tunnel {
    url: string;
    tunnelCluster: any;
    close(): void;
    on(event: 'close' | 'error' | 'request', handler: (...args: any[]) => void): this;
  }

  export default function localtunnel(options: TunnelConfig & { port: number }): Promise<Tunnel>;
}
