# AnyBridge demo video — master prompt

ROLE
You are the video engineer for AnyBridge's Meta hackathon demo. First read
docs/PROJECT_BRIEF.md and AGENTS.md. Load the remotion-* skills before writing code.

GOAL
Build dist/anybridge-demo.mp4 by code: 1920x1080, 30 fps, about 2:20 (hard max
2:50), AI voice-over, burned-in captions, smooth transitions, subtle animation.
No manual recording. No music.

HONESTY RULES (override everything else)
1. Every number, label and result on screen or in narration comes from
   video/facts.json, generated from lab/results.json and runs/*/audit.jsonl.
   Never type a metric by hand. Never invent one.
2. If a fact or clip is missing, OMIT that scene and tell me. Never fill the gap
   with mock data, stock footage, or illustrative UI in a release build.
3. Mock builds (facts.mock.json) show a large MOCK DATA watermark, and
   `--release` must refuse them.
4. Product footage is real: runs/*/browser.mp4 (transcode webm to H.264 first)
   and real log lines from audit.jsonl, labelled with the run id. Charts and KPI
   tiles are renderings of facts.json, labelled with the run id.
5. Do not install skills or run scripts from the internet. Use only the skills
   I installed. Ask before adding any dependency beyond remotion, @remotion/*, zod.
6. Never read or print environment variables, .env files, or API keys.

STACK
Remotion (React) to compose and render. Kokoro-82M (local Python) for narration,
one WAV per scene (24 kHz). ffmpeg for transcoding clips and loudnorm (-16 LUFS).

FACTS CONTRACT (video/facts.json, generated)
{ mock, run_ids{compile,replay,attack}, model{id,provider,effort},
  compile{steps,model_calls,seconds,cost_usd}, replay{model_calls,seconds},
  verify{evidence}, redteam{passed,total}, eval{success,n,tasks[]},
  limits[], repo, install }

STRUCTURE (intro, overview, key metrics, insights, conclusion)
1  0:00 Intro: the problem (assistants only use tools with integrations) + title.
2  0:12 Overview: animated flow client(model) <-MCP-> engine: discover, plan,
      approve, execute, verify, save. Terminal pane types real doctor and
      `mcp list` lines from the log.
3  0:30 Live demo: real browser clip of the unfamiliar app, numbered menu, plan
      JSON, then split screen: model's execute attempt returns UNAPPROVED, human
      approves in a second terminal (audit.jsonl events).
4  1:15 Execution + independent verification: browser clip, then the verifier
      reading the data file (verify.evidence).
5  1:40 Metrics dashboard: KPI tiles (verified success n/N, replay model calls,
      compile vs replay seconds, cost per compile, attacks blocked) plus a bar
      chart (compile vs replay) and a per-task success grid. Count-up animations
      must end on the exact fact values.
6  2:05 Insights: 2-3 findings derived from facts, plus one honest limitation
      from facts.limits.
7  2:15 Conclusion: install command, repo, MIT, "Built Oct 26 - Nov 4", credits
      line: synthetic voice (Kokoro-82M), narration drafted with Muse Spark 1.3.

DESIGN
Dark neutral background, one accent colour, Inter + JetBrains Mono, 96 px safe
margins, text >= 28 px, WCAG AA contrast. Transitions 12-18 frames via
@remotion/transitions. Spring entrances 0.4-0.6 s. Max two things animating at
once. Captions at the bottom.

AUDIO AND TIMING
Scene length = narration WAV length + 0.15 s, read via calculateMetadata. No
hard-coded timings. No silent gaps. Narration text comes from video/narration.json
(locked by me) with video/pronounce.json applied.

TASKS (do in order; stop after each and show me what you did)
1 Check Remotion, ffmpeg, Kokoro are installed. List anything missing.
2 facts.json generator + facts.mock.json. Fail loudly on missing inputs.
3 Scenes 1, 2, 7 with mock narration. Render a still of each.
4 Scenes 3-6 bound to facts.
5 TTS script, <Audio> per scene, durations.
6 Captions (use the remotion-captions skill).
7 qa script: total <= 170 s, every number in narration and on screen exists in
  facts.json, no MOCK watermark, no null bindings.
8 `npm run video:render -- --release`. Report what is real and what was omitted.

DONE WHEN
qa passes, the mp4 plays, and you have listed every scene that was omitted
and why.
