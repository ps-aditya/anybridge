import data from "../captures.json";

export interface CaptureData {
  available: boolean;
  approve_output: string;
  summary: {
    captured_at: string;
    plan_id: string;
    execute_status: string;
    verify_verdict: string;
    replay_status: string;
    replay_verdict: string;
  } | null;
  verify: {
    plan_id: string;
    executed: { status: string; results?: unknown[] };
    verified: {
      verdict: string;
      evidence?: Array<{ check?: string; kind?: string; path?: string; target?: string; found?: boolean }>;
    };
  } | null;
  replay: {
    replay: {
      status: string;
      verification?: {
        verdict: string;
        evidence?: Array<{ check?: string; kind?: string; path?: string; target?: string; found?: boolean }>;
      };
    };
  } | null;
}

export const getCaptures = (): CaptureData => data as CaptureData;
