import facts from "../facts.json";

export interface Facts {
  mock: boolean;
  run_ids: { compile: string; replay: string; attack: string };
  model: { id: string; provider: string; effort: string };
  compile: { steps: number; model_calls: number | null; seconds: number; cost_usd: number | null };
  replay: { model_calls: number; seconds: number };
  verify: { evidence: string };
  redteam: { passed: number; total: number };
  eval: { success: number; n: number; tasks: boolean[] };
  limits: string[];
  repo: string;
  install: string;
}

export const getFacts = (): Facts => facts as Facts;
