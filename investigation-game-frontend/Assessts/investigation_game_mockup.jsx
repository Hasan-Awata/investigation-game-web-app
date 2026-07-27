import React, { useMemo, useState } from "react";

type TabKey = "briefing" | "evidence" | "assessment";
type EvidenceType = "Document" | "Photo" | "Testimony" | "Audio" | "Forensic";

type EvidenceItem = {
  id: number;
  type: EvidenceType;
  title: string;
  subtitle: string;
  detail: string;
  pinned: boolean;
  x?: number;
  y?: number;
};

type Question = {
  id: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  wrongClue: string;
};

type Player = {
  name: string;
  xp: number;
  isHost?: boolean;
  online: boolean;
};

const players: Player[] = [
  { name: "Hasan", xp: 1250, isHost: true, online: true },
  { name: "Lina Park", xp: 860, online: true },
  { name: "Omar Khalid", xp: 740, online: true },
  { name: "Maya Chen", xp: 620, online: true },
  { name: "Waiting for player...", xp: 0, online: false },
  { name: "Waiting for player...", xp: 0, online: false },
];

const evidence: EvidenceItem[] = [
  {
    id: 1,
    type: "Document",
    title: "Office Floor Plan",
    subtitle: "Blueprints recovered from building archive",
    detail:
      "A layout of the 14th floor reveals an emergency stairwell blocked by a temporary storage cage.",
    pinned: true,
    x: 8,
    y: 12,
  },
  {
    id: 2,
    type: "Photo",
    title: "Crime Scene Photo",
    subtitle: "Hallway view near the executive office",
    detail:
      "A blurred photo showing wet footprints and a shattered glass panel near the security door.",
    pinned: true,
    x: 33,
    y: 10,
  },
  {
    id: 3,
    type: "Testimony",
    title: "Receptionist Statement",
    subtitle: "Interview transcript, 23:41",
    detail:
      "The receptionist heard footsteps and a raised voice, then saw someone leave with a badge clipped to a coat.",
    pinned: true,
    x: 60,
    y: 14,
  },
  {
    id: 4,
    type: "Audio",
    title: "Security Footage",
    subtitle: "23:00 - 23:30 corridor audio",
    detail:
      "Low audio hiss with three distinct sounds: a door latch, a short argument, and a hard metallic impact.",
    pinned: true,
    x: 79,
    y: 15,
  },
  {
    id: 5,
    type: "Forensic",
    title: "Fingerprints Report",
    subtitle: "Partial latent print match",
    detail:
      "A partial fingerprint belongs to someone with building access but not executive clearance.",
    pinned: false,
    x: 12,
    y: 55,
  },
  {
    id: 6,
    type: "Document",
    title: "Email from CEO (Draft)",
    subtitle: "Recovered from deleted mail folder",
    detail:
      "A draft email names a scheduled midnight meeting with one unknown recipient and a missing attachment.",
    pinned: false,
    x: 33,
    y: 57,
  },
  {
    id: 7,
    type: "Photo",
    title: "Broken Window",
    subtitle: "Exterior shot, rain residue visible",
    detail:
      "The window damage appears internal-first, suggesting the glass was struck from inside the office.",
    pinned: false,
    x: 54,
    y: 58,
  },
  {
    id: 8,
    type: "Testimony",
    title: "IT Technician Statement",
    subtitle: "Witness notes, 00:12",
    detail:
      "The technician insists he never entered the executive suite but did see the security monitor flicker.",
    pinned: false,
    x: 77,
    y: 59,
  },
];

const questions: Question[] = [
  {
    id: 1,
    prompt: "Who was the last person to see the CEO alive?",
    options: [
      "The Receptionist (Lina)",
      "The IT Technician (Mark)",
      "The Executive Assistant (Sophie)",
      "The Head of Security (Ramos)",
    ],
    correctIndex: 2,
    wrongClue: "The Persona detected a missing badge record in the executive wing.",
  },
  {
    id: 2,
    prompt: "What best explains the broken window?",
    options: [
      "External burglary attempt",
      "Storm damage",
      "Internal impact after the argument",
      "Accidental cleaning accident",
    ],
    correctIndex: 2,
    wrongClue: "The glass fragments are concentrated inside the room, not outside.",
  },
  {
    id: 3,
    prompt: "Which clue most strongly links the suspect to the scene?",
    options: [
      "A coffee receipt",
      "A partial access badge imprint",
      "A torn glove fiber",
      "A rain-soaked coat button",
    ],
    correctIndex: 1,
    wrongClue: "The access evidence is stronger than the physical debris.",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition",
        active
          ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/40 backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-xs uppercase tracking-[0.32em] text-slate-500">{subtitle}</div>
        <h2 className="mt-1 text-lg font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "cyan" | "amber" | "green" | "red" }) {
  const tones = {
    neutral: "bg-white/5 text-slate-200 ring-white/10",
    cyan: "bg-cyan-400/10 text-cyan-200 ring-cyan-400/25",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-400/25",
    green: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
    red: "bg-rose-400/10 text-rose-200 ring-rose-400/25",
  } as const;

  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs ring-1", tones[tone])}>
      {children}
    </span>
  );
}

export default function InvestigationGameMockup() {
  const [activeTab, setActiveTab] = useState<TabKey>("briefing");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [personaOpen, setPersonaOpen] = useState(false);
  const [submitted, setSubmitted] = useState<null | { success: boolean; message: string }>(null);

  const allAnswered = questions.every((q) => selectedAnswers[q.id] !== undefined);
  const allCorrect = questions.every((q) => selectedAnswers[q.id] === q.correctIndex);
  const consensusPercent = Math.round((Object.keys(selectedAnswers).length / questions.length) * 100);

  const currentLevelVotes = useMemo(() => {
    return questions.map((q) => ({
      id: q.id,
      votes: q.options.map((_, idx) => {
        const userVote = selectedAnswers[q.id];
        const hostBoost = userVote === idx ? 2 : 0;
        const simulatedPlayerVotes = idx === q.correctIndex ? 2 : idx === 0 ? 1 : 0;
        return hostBoost + simulatedPlayerVotes;
      }),
    }));
  }, [selectedAnswers]);

  function submitTheory() {
    if (!allAnswered) return;
    if (allCorrect) {
      setSubmitted({ success: true, message: "Consensus accepted. Case advanced to the next level." });
      return;
    }

    setSubmitted({ success: false, message: "Batch rejected. The Persona can reveal a hidden clue." });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_25%),linear-gradient(180deg,#04070d_0%,#0b1018_35%,#06080d_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-5 p-5 xl:p-6">
        <aside className="hidden w-[340px] shrink-0 flex-col gap-5 lg:flex">
          <Panel title="CASEFILE INVESTIGATIONS" subtitle="Room Overview" className="overflow-hidden">
            <div className="space-y-5">
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Room Code</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-3xl font-semibold tracking-[0.18em] text-slate-100">7K9X2A</div>
                  <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
                    Copy
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Status: ACTIVE
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">Players (4/6)</div>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.name}
                      className={cx(
                        "flex items-center justify-between rounded-2xl border px-3 py-3 transition",
                        player.online
                          ? "border-white/10 bg-white/5"
                          : "border-dashed border-white/5 bg-white/[0.03] text-slate-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            "grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold",
                            player.isHost
                              ? "border-amber-400/70 bg-amber-400/10 text-amber-200"
                              : "border-cyan-400/20 bg-cyan-400/5 text-cyan-100"
                          )}
                        >
                          {player.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-100">{player.name}</div>
                            {player.isHost && <Badge tone="amber">HOST</Badge>}
                          </div>
                          <div className="text-xs text-slate-400">XP {player.xp}</div>
                        </div>
                      </div>
                      <div className={cx("text-xs", player.online ? "text-emerald-300" : "text-slate-600")}>{player.online ? "Online" : "Waiting"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Host Advantage</div>
                <div className="mt-2 text-sm text-slate-200">Your vote counts as 2x. You can consult the Persona.</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Your XP</div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold">1,250</div>
                    <div className="text-sm text-slate-400">Next Level: 1,500 XP</div>
                  </div>
                  <div className="h-20 w-20 rounded-full border border-cyan-400/20 bg-[conic-gradient(from_180deg,rgba(34,211,238,0.95)_0deg,rgba(34,211,238,0.95)_300deg,rgba(255,255,255,0.08)_300deg)] p-1">
                    <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-sm font-semibold text-cyan-100">83%</div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="SYSTEM" subtitle="Quick Controls">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10">Settings</button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10">Help</button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10">Exit</button>
            </div>
          </Panel>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                  ⌁
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Collaborative Investigation Game</div>
                  <div className="text-lg font-semibold text-slate-100">The Silverbrook Murders</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <TabButton active={activeTab === "briefing"} onClick={() => setActiveTab("briefing")}>Briefing Room</TabButton>
                <TabButton active={activeTab === "evidence"} onClick={() => setActiveTab("evidence")}>Evidence Board</TabButton>
                <TabButton active={activeTab === "assessment"} onClick={() => setActiveTab("assessment")}>Assessment</TabButton>
              </div>
            </div>
          </header>

          {activeTab === "briefing" && (
            <div className="grid flex-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel title="The Briefing Room" subtitle="Case Showcase" className="overflow-hidden">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_20%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_30%_60%,rgba(250,204,21,0.1),transparent_20%),linear-gradient(120deg,rgba(10,12,16,0.2),rgba(10,12,16,0.82))]" />
                  <div className="relative grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Case #23-07</div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-50 md:text-6xl">The Silverbrook Murders</h1>
                        <p className="max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                          The CEO of Silverbrook Technologies was found dead in his office late last night.
                          No forced entry. No obvious weapon. Someone close may be hiding the truth.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Badge tone="cyan">Min Player XP: 800</Badge>
                        <Badge tone="amber">XP on Solve: 1,500</Badge>
                        <Badge tone="green">Status: Active</Badge>
                        <Badge tone="neutral">Levels: 1 / 5</Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab("evidence")}
                          className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-4 text-sm font-medium text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.08)] transition hover:bg-cyan-400/15"
                        >
                          Enter Case
                        </button>
                        <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                          Case Files
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
                        <div className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-500">Case File Summary</div>
                        <ul className="space-y-3 text-sm text-slate-300">
                          <li className="flex gap-2"><span className="text-cyan-300">◇</span> 5 levels of evidence and verdict checks</li>
                          <li className="flex gap-2"><span className="text-cyan-300">◇</span> Multiplayer room with weighted host vote</li>
                          <li className="flex gap-2"><span className="text-cyan-300">◇</span> Persona clue unlocks after failed theory</li>
                        </ul>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
                        <div className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-500">Next Level Preview</div>
                        <div className="text-base font-medium text-slate-100">Level 1: The Last Known Moments</div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">Review security footage, witness statements, and the first forensic report.</p>
                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                          <div className="aspect-[16/9] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.55)),radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_50%)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              <div className="grid gap-5">
                <Panel title="Session Status" subtitle="Live Multiplayer">
                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span>Room Status</span>
                        <Badge tone="green">Active</Badge>
                      </div>
                      <div className="mt-2 text-slate-400">Room is open. Players can join with code 7K9X2A.</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span>Consensus Progress</span>
                        <span className="font-semibold text-cyan-200">{consensusPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${consensusPercent}%` }} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4">
                      <div className="text-amber-200">Host-only Persona access</div>
                      <div className="mt-1 text-slate-400">Failure unlocks an obfuscated clue narrative.</div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Atmosphere" subtitle="Visual Direction">
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Dark slate surfaces</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Cyan, amber, and crimson accents</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Glass panels with forensic overlays</div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="grid flex-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Evidence Board" subtitle="Pinboard" className="min-h-[760px]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Level 1: The Last Known Moments</div>
                    <h3 className="mt-1 text-xl font-semibold text-slate-100">12 items collected</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">All Types</button>
                    <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">Grid</button>
                    <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">List</button>
                  </div>
                </div>

                <div className="relative min-h-[650px] overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
                  <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40">
                    <line x1="8%" y1="12%" x2="33%" y2="10%" stroke="rgba(34,211,238,0.35)" strokeWidth="1.5" />
                    <line x1="33%" y1="10%" x2="60%" y2="14%" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" />
                    <line x1="33%" y1="10%" x2="12%" y2="55%" stroke="rgba(250,204,21,0.18)" strokeWidth="1.5" />
                    <line x1="60%" y1="14%" x2="79%" y2="15%" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" />
                    <line x1="33%" y1="57%" x2="54%" y2="58%" stroke="rgba(34,211,238,0.2)" strokeWidth="1.5" />
                  </svg>

                  {evidence.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedEvidence(item)}
                      className={cx(
                        "absolute w-[190px] rounded-2xl border p-3 text-left shadow-xl transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-cyan-400/40 hover:bg-white/10",
                        item.pinned
                          ? "border-cyan-400/20 bg-slate-900/90"
                          : "border-white/10 bg-slate-900/75"
                      )}
                      style={{ left: `${item.x}%`, top: `${item.y}%` }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge tone={item.type === "Forensic" ? "amber" : item.type === "Audio" ? "cyan" : "neutral"}>{item.type}</Badge>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">0{item.id}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{item.subtitle}</div>
                      <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3 text-xs leading-5 text-slate-300">
                        {item.type === "Audio" ? (
                          <div>
                            <div className="mb-2 h-8 rounded-lg bg-[linear-gradient(90deg,rgba(34,211,238,0.0),rgba(34,211,238,0.3),rgba(34,211,238,0.0))]" />
                            <div>Waveform ready for playback.</div>
                          </div>
                        ) : item.type === "Photo" ? (
                          <div className="aspect-[4/3] rounded-lg border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%),linear-gradient(135deg,rgba(20,20,20,0.9),rgba(7,9,12,0.9))]" />
                        ) : (
                          <div>{item.detail}</div>
                        )}
                      </div>
                    </button>
                  ))}

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-slate-300 backdrop-blur">
                    <div>Drag items to connect related evidence.</div>
                    <button className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-100 hover:bg-cyan-400/15">
                      View Selected
                    </button>
                  </div>
                </div>
              </Panel>

              <div className="grid gap-5">
                <Panel title="Selected Evidence" subtitle="Detail Viewer">
                  {selectedEvidence ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge tone={selectedEvidence.type === "Forensic" ? "amber" : selectedEvidence.type === "Audio" ? "cyan" : "neutral"}>{selectedEvidence.type}</Badge>
                        <button onClick={() => setSelectedEvidence(null)} className="text-sm text-slate-400 hover:text-slate-200">
                          Close
                        </button>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-100">{selectedEvidence.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{selectedEvidence.subtitle}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                        {selectedEvidence.detail}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-slate-500">Linked clue</div>
                          <div className="mt-1 text-slate-200">Question set</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-slate-500">Confidence</div>
                          <div className="mt-1 text-cyan-200">High</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400">
                      Select a card to inspect the clue in detail.
                    </div>
                  )}
                </Panel>

                <Panel title="Connection Rules" subtitle="Board Logic">
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Documents: clean file card with metadata</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Photos: vignette thumbnail with depth</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Audio: waveform card and play control</div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Forensic: lab-style report tile</div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "assessment" && (
            <div className="grid flex-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <Panel title="Persona Terminal" subtitle="Encrypted Clue Channel">
                  <div className="rounded-3xl border border-amber-400/15 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.1),transparent_50%),linear-gradient(180deg,rgba(10,10,10,0.9),rgba(4,4,4,0.95))] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.3em] text-amber-200/60">The Persona</div>
                        <div className="text-sm text-slate-400">Host can consult for a clue</div>
                      </div>
                      <button
                        onClick={() => setPersonaOpen((v) => !v)}
                        className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-400/15"
                      >
                        Consult Persona
                      </button>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-sm leading-7 text-amber-200">
                      {personaOpen ? (
                        <div className="space-y-1">
                          <div>&gt; Establishing secure connection...</div>
                          <div>&gt; Decrypting narrative pattern...</div>
                          <div>&gt; {questions[0].wrongClue}</div>
                        </div>
                      ) : (
                        <div className="text-amber-100/70">[ encrypted signal ready ]</div>
                      )}
                    </div>
                  </div>
                </Panel>

                <Panel title="Level 1: The Last Known Moments" subtitle="Question Set">
                  <div className="space-y-5">
                    {questions.map((question, qIndex) => (
                      <div key={question.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Question {qIndex + 1} of {questions.length}</div>
                            <h3 className="mt-1 text-lg font-semibold text-slate-100">{question.prompt}</h3>
                          </div>
                          <Badge tone={selectedAnswers[question.id] !== undefined ? "green" : "neutral"}>
                            {selectedAnswers[question.id] !== undefined ? "Locked" : "Pending"}
                          </Badge>
                        </div>

                        <div className="grid gap-3">
                          {question.options.map((option, idx) => {
                            const selected = selectedAnswers[question.id] === idx;
                            return (
                              <button
                                key={option}
                                onClick={() => setSelectedAnswers((prev) => ({ ...prev, [question.id]: idx }))}
                                className={cx(
                                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                                  selected
                                    ? "border-cyan-400/45 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
                                    : "border-white/10 bg-slate-950/70 hover:bg-white/8"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cx("grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold", selected ? "border-cyan-400/50 text-cyan-100" : "border-white/10 text-slate-300")}>{String.fromCharCode(65 + idx)}</div>
                                  <div className="text-sm text-slate-100">{option}</div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {selected ? "Chosen" : "Vote"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="space-y-5">
                <Panel title="Live Consensus" subtitle="Vote Tracker">
                  <div className="space-y-4">
                    {questions.map((question) => {
                      const choiceIndex = selectedAnswers[question.id];
                      const bars = question.options.map((_, idx) => currentLevelVotes.find((v) => v.id === question.id)?.votes[idx] ?? 0);
                      return (
                        <div key={question.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm text-slate-200">{question.prompt}</div>
                            <div className="text-xs text-slate-500">Weighted votes</div>
                          </div>
                          <div className="space-y-3">
                            {question.options.map((option, idx) => {
                              const votes = bars[idx];
                              const active = choiceIndex === idx;
                              return (
                                <div
                                  key={option}
                                  className={cx(
                                    "rounded-2xl border px-3 py-3 transition",
                                    active ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-slate-950/60"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className={cx("grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold", active ? "border-cyan-400/50 text-cyan-100" : "border-white/10 text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                                      <div className="text-sm text-slate-100">{option}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      {votes > 0 && <span>{votes} votes</span>}
                                      {active && <Badge tone="cyan">You voted</Badge>}
                                    </div>
                                  </div>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                                    <div
                                      className={cx("h-full rounded-full transition-all", idx === question.correctIndex ? "bg-cyan-400/80" : "bg-white/20")}
                                      style={{ width: `${Math.max(8, votes * 18)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Theory Control" subtitle="Submission">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Consensus Progress</span>
                        <span className="font-semibold text-cyan-200">{consensusPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${consensusPercent}%` }} />
                      </div>
                      <div className="mt-3 text-slate-400">All players must reach consensus to submit.</div>
                    </div>

                    <button
                      onClick={submitTheory}
                      disabled={!allAnswered}
                      className={cx(
                        "w-full rounded-3xl px-5 py-5 text-lg font-semibold transition",
                        allAnswered
                          ? "border border-cyan-400/35 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/20"
                          : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
                      )}
                    >
                      Submit Theory
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Questions Locked</span>
                        <span className="text-cyan-200">{Object.keys(selectedAnswers).length} / {questions.length}</span>
                      </div>
                    </div>
                  </div>
                </Panel>

                {submitted && (
                  <div
                    className={cx(
                      "rounded-3xl border p-5 shadow-2xl",
                      submitted.success
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                        : "border-rose-400/25 bg-rose-400/10 text-rose-100"
                    )}
                  >
                    <div className="text-sm uppercase tracking-[0.28em] opacity-80">
                      {submitted.success ? "Case Progressed" : "Theory Rejected"}
                    </div>
                    <div className="mt-2 text-base">{submitted.message}</div>
                    {!submitted.success && (
                      <button
                        onClick={() => setPersonaOpen(true)}
                        className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-400/15"
                      >
                        Reveal Persona Clue
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedEvidence && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Evidence Detail</div>
                <div className="mt-1 text-xl font-semibold text-slate-100">{selectedEvidence.title}</div>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                Close
              </button>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                <div className="aspect-[4/3] rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.15),transparent_40%),linear-gradient(135deg,rgba(18,18,18,0.95),rgba(7,9,12,0.95))]" />
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge tone={selectedEvidence.type === "Forensic" ? "amber" : selectedEvidence.type === "Audio" ? "cyan" : "neutral"}>{selectedEvidence.type}</Badge>
                  {selectedEvidence.pinned ? <Badge tone="cyan">Pinned</Badge> : <Badge tone="neutral">Loose</Badge>}
                </div>
                <p className="text-sm leading-7 text-slate-300">{selectedEvidence.detail}</p>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  Suggested use: connect this clue to the current level question set and compare against the other pinned evidence cards.
                </div>
                <div className="flex gap-3">
                  <button className="rounded-2xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/15">
                    Pin to Board
                  </button>
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 hover:bg-white/10">
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
