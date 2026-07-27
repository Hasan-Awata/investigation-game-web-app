import React, { useState, useMemo } from "react";

/**
 * CASEFILE // Collaborative Investigation Game — UI Mockup (v2)
 * ----------------------------------------------------------------
 * v2 changes from the first pass:
 *   - Every case now has its own painted "scene" (pure CSS, no
 *     stock photography) that sets its vibe — corporate-noir teal,
 *     dockland rust-fog, backstage crimson — used as the folder
 *     thumbnail AND the briefing hero.
 *   - The Evidence Board is now an actual pinboard: cork-textured
 *     panel, items pinned/taped at slightly different angles,
 *     rendered as the physical object they represent (manila
 *     folder, lined index card, cassette sticker, taped polaroid,
 *     lab tag) instead of uniform cards.
 *
 * Palette
 *   --ink #0B0E13   --panel #151A21   --paper #ECE4D3
 *   --amber #C68A3E --cyan #55BEC2   --crimson #B3483C  --gold #D6B26E
 *   --cork #4A3423  --cork-2 #5C4530  (pinboard only)
 *
 * Type: Oswald (display/stamps) · Inter (body) · JetBrains Mono (data)
 */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`;

// ---------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------

const CASES = [
  {
    id: "blackwood",
    title: "The Blackwood Ledger",
    logline: "A locked office. An untouched safe. Three colleagues, three different nights.",
    story:
      "A mid-tier accountant is found dead in a locked office on the 14th floor of Blackwood & Vance. The door was bolted from the inside. The safe is untouched. Three colleagues remember three different nights.",
    min_player_XP: 400,
    XP_on_solve: 850,
    status: "active",
    scene: "blackwood",
    accent: "cyan",
  },
  {
    id: "docklands",
    title: "Static on the Docks",
    logline: "A cargo manifest that doesn't add up, and a radio that won't stop transmitting.",
    story:
      "Warehouse 9 reports a container short. The night foreman swears the manifest was full at 2 AM. Port radio picked up eleven minutes of static from a channel that was decommissioned two years ago.",
    min_player_XP: 250,
    XP_on_solve: 600,
    status: "active",
    scene: "docklands",
    accent: "amber",
  },
  {
    id: "understudy",
    title: "The Understudy's Cue",
    logline: "The lead vanished mid-performance. The understudy already knew her lines.",
    story:
      "During the second act of a sold-out run, the lead actress walked offstage and never came back. Her understudy finished the scene word-for-word — a scene that hadn't been written yet.",
    min_player_XP: 700,
    XP_on_solve: 1100,
    status: "solved",
    scene: "understudy",
    accent: "crimson",
  },
];

const EVIDENCE = [
  { id: 1, type: "document", label: "Signed NDA, pg. 3", tag: "EX-014", rotate: -4 },
  { id: 2, type: "testimony", label: "R. Alvez, night guard", tag: "EX-015", rotate: 3 },
  { id: 3, type: "audio", label: "Voicemail, 11:47 PM", tag: "EX-016", rotate: -2 },
  { id: 4, type: "image", label: "Office door, latch detail", tag: "EX-017", rotate: 5 },
  { id: 5, type: "forensic", label: "Toxicology summary", tag: "EX-018", rotate: -3 },
  { id: 6, type: "document", label: "Ledger page, torn corner", tag: "EX-019", rotate: 2 },
  { id: 7, type: "image", label: "Elevator, badge scanner", tag: "EX-020", rotate: -6 },
  { id: 8, type: "testimony", label: "Priya D., accounting", tag: "EX-021", rotate: 4 },
];

const PLAYERS = [
  { id: 1, name: "Nadia", isHost: true, initials: "ND" },
  { id: 2, name: "Farid", isHost: false, initials: "FR" },
  { id: 3, name: "Priya", isHost: false, initials: "PR" },
  { id: 4, name: "Tomas", isHost: false, initials: "TM" },
];

const QUESTIONS = [
  {
    id: "q1",
    prompt: "Which detail places the guard's timeline in doubt?",
    msg_when_wrong:
      "Alvez's badge log and the elevator log disagree by six minutes — someone edited one of them after the fact.",
    choices: [
      { id: "q1c1", label: "The badge-in timestamp" },
      { id: "q1c2", label: "The description of the coat" },
      { id: "q1c3", label: "The mention of rain" },
    ],
  },
  {
    id: "q2",
    prompt: "What does the torn ledger corner most likely conceal?",
    msg_when_wrong:
      "The torn corner isn't damage — it's a deliberate removal. Whatever was written there matched a name still in the building that night.",
    choices: [
      { id: "q2c1", label: "A second signature" },
      { id: "q2c2", label: "A wire transfer amount" },
      { id: "q2c3", label: "A dated stamp" },
    ],
  },
];

const EVIDENCE_ICON = {
  document: "▤",
  testimony: "❝",
  audio: "▮▯▮",
  image: "▣",
  forensic: "✦",
};

// ---------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------

function PlayerChip({ player, active }) {
  return (
    <div
      className={`player-chip ${player.isHost ? "player-chip--host" : ""} ${
        active ? "player-chip--active" : ""
      }`}
      title={player.name}
    >
      {player.initials}
    </div>
  );
}

function StatusStamp({ status }) {
  const tone = status === "solved" ? "cyan" : "amber";
  const label = status === "solved" ? "solved" : "active case";
  return (
    <span className="stamp" style={{ "--stamp-color": `var(--${tone})` }}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------
// Tab 1 — The Briefing Room (case gallery + selected case detail)
// ---------------------------------------------------------------

function BriefingRoom() {
  const [activeId, setActiveId] = useState(CASES[0].id);
  const active = CASES.find((c) => c.id === activeId);

  return (
    <div className="briefing">
      <div className="briefing__intro">
        <span className="eyebrow">Case Archive · 3 files</span>
        <h2 className="section-title">The Briefing Room</h2>
      </div>

      <div className="folder-rail">
        {CASES.map((c) => (
          <button
            key={c.id}
            className={`folder-card scene scene--${c.scene} ${
              c.id === activeId ? "folder-card--active" : ""
            }`}
            onClick={() => setActiveId(c.id)}
          >
            <span className="folder-card__tab">{c.id === activeId ? "open" : ""}</span>
            <div className="folder-card__scrim" />
            <div className="folder-card__body">
              <span
                className="stamp stamp--sm"
                style={{ "--stamp-color": `var(--${c.accent})` }}
              >
                {c.status === "solved" ? "solved" : "active"}
              </span>
              <h3 className="folder-card__title">{c.title}</h3>
              <p className="folder-card__logline">{c.logline}</p>
            </div>
          </button>
        ))}
      </div>

      <div className={`briefing__hero scene scene--${active.scene}`}>
        <div className="briefing__vignette" />
        <div className="briefing__hero-inner">
          <span className="eyebrow">Case File · {active.title}</span>
          <h1 className="briefing__title">{active.title}</h1>
          <p className="briefing__story">{active.story}</p>
          <div className="pill-row">
            <span className="pill">
              <span className="pill__k">Entry XP</span>
              <span className="pill__v">{active.min_player_XP}</span>
            </span>
            <span className="pill">
              <span className="pill__k">Reward</span>
              <span className="pill__v">+{active.XP_on_solve} XP</span>
            </span>
            <span className="pill pill--status">
              <span className="pill__dot" style={{ background: `var(--${active.accent})`, boxShadow: `0 0 8px var(--${active.accent})` }} />
              <span className="pill__v">{active.status}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="briefing__footer">
        <p className="mono-note">
          4 investigators cleared to enter · door opens on host action
        </p>
        <button className="btn btn--primary" disabled={active.status === "solved"}>
          {active.status === "solved" ? "case closed" : "enter the room"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Tab 2 — The Evidence Board (pinboard)
// ---------------------------------------------------------------

function PinnedItem({ item, onOpen }) {
  const style = { "--rot": `${item.rotate}deg` };

  if (item.type === "image") {
    return (
      <button className="pin pin--polaroid" style={style} onClick={() => onOpen(item)}>
        <span className="pin__tape pin__tape--l" />
        <span className="pin__tape pin__tape--r" />
        <span className="pin__photo scene scene--blackwood" />
        <span className="pin__cap">{item.label}</span>
      </button>
    );
  }

  if (item.type === "audio") {
    return (
      <button className="pin pin--cassette" style={style} onClick={() => onOpen(item)}>
        <span className="pin__pin" />
        <div className="cassette">
          <div className="cassette__window">
            <span className="cassette__reel" />
            <span className="cassette__reel" />
          </div>
          <span className="cassette__label">{item.label}</span>
        </div>
      </button>
    );
  }

  if (item.type === "testimony") {
    return (
      <button className="pin pin--index" style={style} onClick={() => onOpen(item)}>
        <span className="pin__pin" />
        <span className="pin__quote">❝</span>
        <span className="pin__label">{item.label}</span>
        <span className="pin__meta">{item.tag}</span>
      </button>
    );
  }

  if (item.type === "forensic") {
    return (
      <button className="pin pin--lab" style={style} onClick={() => onOpen(item)}>
        <span className="pin__clip" />
        <span className="pin__glyph">{EVIDENCE_ICON.forensic}</span>
        <span className="pin__label">{item.label}</span>
        <span className="pin__meta">{item.tag}</span>
      </button>
    );
  }

  // document — manila folder
  return (
    <button className="pin pin--folder" style={style} onClick={() => onOpen(item)}>
      <span className="pin__pin" />
      <span className="folder-tab" />
      <span className="pin__label">{item.label}</span>
      <span className="pin__meta">{item.tag}</span>
    </button>
  );
}

function EvidenceBoard() {
  const [open, setOpen] = useState(null);
  return (
    <div className="board">
      <div className="board__header">
        <div>
          <span className="eyebrow">Level 2 of 5</span>
          <h2 className="section-title">The Evidence Board</h2>
        </div>
        <p className="board__hint mono-note">pinned by the room · click to open</p>
      </div>

      <div className="corkboard">
        <div className="corkboard__frame">
          {EVIDENCE.map((item) => (
            <PinnedItem key={item.id} item={item} onOpen={setOpen} />
          ))}
        </div>
      </div>

      {open && (
        <div className="modal-scrim" onClick={() => setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__topline">
              <span className="mono-note">{open.tag}</span>
              <button className="modal__close" onClick={() => setOpen(null)}>
                ✕
              </button>
            </div>
            <h3 className="modal__title">{open.label}</h3>
            <div className={`modal__preview modal__preview--${open.type}`}>
              {open.type === "audio" ? (
                <div className="waveform">
                  <button className="waveform__play">▶</button>
                  <div className="waveform__bars">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span key={i} style={{ height: `${18 + ((i * 37) % 60)}%` }} />
                    ))}
                  </div>
                </div>
              ) : open.type === "image" ? (
                <span className="modal__photo scene scene--blackwood" />
              ) : (
                <span className="modal__glyph">{EVIDENCE_ICON[open.type]}</span>
              )}
            </div>
            <p className="modal__desc">
              Chain of custody logged. Cross-reference with Level 1 testimony
              for discrepancies in stated time of arrival.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Tab 3 — The Assessment
// ---------------------------------------------------------------

function Assessment() {
  const [answers, setAnswers] = useState({});
  const [personaOpen, setPersonaOpen] = useState(false);
  const [failed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.id]);
  const failedQuestion = QUESTIONS[1];

  function selectChoice(qId, cId) {
    setAnswers((prev) => ({ ...prev, [qId]: cId }));
  }

  function submitTheory() {
    if (!allAnswered) return;
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 900);
  }

  return (
    <div className="assessment">
      <div className={`persona ${personaOpen ? "persona--open" : ""}`}>
        <div className="persona__head">
          <span className="persona__label">◈ the persona</span>
          {failed ? (
            <button className="btn btn--ghost btn--amber" onClick={() => setPersonaOpen((v) => !v)}>
              {personaOpen ? "reseal" : "consult persona"}
            </button>
          ) : (
            <span className="mono-note">no failures logged</span>
          )}
        </div>
        <div className="persona__body">
          {personaOpen ? (
            <p className="persona__text">{failedQuestion.msg_when_wrong}</p>
          ) : (
            <p className="persona__redacted">
              <span className="bar" style={{ width: "72%" }} />
              <span className="bar" style={{ width: "54%" }} />
              <span className="bar" style={{ width: "63%" }} />
            </p>
          )}
        </div>
      </div>

      <div className="assessment__grid">
        <div className="verdicts">
          <span className="eyebrow">Level 2 · The Verdicts</span>
          {QUESTIONS.map((q, qi) => (
            <div className="verdict-card" key={q.id}>
              <div className="verdict-card__head">
                <span className="verdict-card__num">Q{qi + 1}</span>
                <p className="verdict-card__prompt">{q.prompt}</p>
              </div>
              <div className="verdict-card__choices">
                {q.choices.map((c) => (
                  <button
                    key={c.id}
                    className={`node ${answers[q.id] === c.id ? "node--selected" : ""}`}
                    onClick={() => selectChoice(q.id, c.id)}
                  >
                    <span className="node__ring" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="consensus">
          <span className="eyebrow">Consensus</span>
          {QUESTIONS.map((q) => (
            <div className="consensus-row" key={q.id}>
              <p className="consensus-row__prompt mono-note">{q.prompt}</p>
              <div className="consensus-row__choices">
                {q.choices.map((c) => (
                  <div className="consensus-slot" key={c.id}>
                    <span className="consensus-slot__label">{c.label}</span>
                    <div className="consensus-slot__avatars">
                      {answers[q.id] === c.id &&
                        PLAYERS.map((p, i) => <PlayerChip key={p.id} player={p} active={i === 0} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className={`submit-fab ${allAnswered ? "submit-fab--ready" : ""}`}
        disabled={!allAnswered}
        onClick={submitTheory}
      >
        {submitting ? "tallying votes…" : "submit theory"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------
// App shell
// ---------------------------------------------------------------

export default function CaseFileMockup() {
  const [tab, setTab] = useState("briefing");

  const tabs = useMemo(
    () => [
      { id: "briefing", label: "Briefing Room", num: "01" },
      { id: "evidence", label: "Evidence Board", num: "02" },
      { id: "assessment", label: "Assessment", num: "03" },
    ],
    []
  );

  return (
    <div className="app">
      <style>{`
        ${FONT_IMPORT}

        :root {
          --ink: #0B0E13;
          --ink-2: #0F131A;
          --panel: #151A21;
          --panel-2: #1B222B;
          --line: #2A323D;
          --paper: #ECE4D3;
          --paper-dim: #A9A28E;
          --amber: #C68A3E;
          --cyan: #55BEC2;
          --crimson: #B3483C;
          --gold: #D6B26E;
          --cork: #4A3423;
          --cork-2: #5C4530;
        }

        * { box-sizing: border-box; }

        .app {
          min-height: 100vh;
          background: radial-gradient(1200px 600px at 15% -10%, #171D25 0%, transparent 60%), var(--ink);
          color: var(--paper);
          font-family: 'Inter', sans-serif;
          display: flex;
          -webkit-font-smoothing: antialiased;
        }

        .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--cyan);
          opacity: 0.85;
        }
        .mono-note { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--paper-dim); }
        .section-title {
          font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 26px;
          letter-spacing: 0.01em; margin: 4px 0 0; color: var(--paper);
        }

        /* ---------- painted scenes (no external images) ---------- */
        .scene { position: relative; background-size: cover; }
        .scene--blackwood {
          background:
            repeating-linear-gradient(100deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 22px),
            radial-gradient(120% 90% at 78% 15%, rgba(214,178,110,0.28) 0%, transparent 40%),
            linear-gradient(200deg, #2C3A44 0%, #16232B 55%, #0C1418 100%);
        }
        .scene--docklands {
          background:
            radial-gradient(140% 70% at 50% 110%, rgba(198,138,62,0.35) 0%, transparent 55%),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0 26px, transparent 26px 52px),
            linear-gradient(190deg, #3A2E22 0%, #241C15 55%, #120E0A 100%);
        }
        .scene--understudy {
          background:
            repeating-linear-gradient(88deg, rgba(0,0,0,0.24) 0 14px, rgba(80,20,18,0.06) 14px 28px),
            radial-gradient(60% 60% at 50% 30%, rgba(230,150,120,0.22) 0%, transparent 60%),
            linear-gradient(200deg, #4A2321 0%, #24100F 55%, #100807 100%);
        }

        /* ---------- sidebar ---------- */
        .sidebar {
          width: 220px; flex-shrink: 0;
          background: linear-gradient(180deg, var(--ink-2), var(--ink));
          border-right: 1px solid var(--line);
          padding: 26px 16px; display: flex; flex-direction: column; gap: 34px;
        }
        .brand { display: flex; flex-direction: column; gap: 2px; padding: 0 6px; }
        .brand__mark { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 19px; letter-spacing: 0.06em; color: var(--paper); }
        .brand__mark span { color: var(--cyan); }
        .brand__sub { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--paper-dim); letter-spacing: 0.08em; }

        .nav { display: flex; flex-direction: column; gap: 4px; }
        .nav__item {
          all: unset; cursor: pointer; display: flex; align-items: baseline; gap: 10px;
          padding: 11px 10px; border-radius: 3px; border-left: 2px solid transparent;
          color: var(--paper-dim); transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .nav__item:hover { background: var(--panel); color: var(--paper); }
        .nav__item--active { background: var(--panel); color: var(--paper); border-left-color: var(--cyan); }
        .nav__num { font-family: 'JetBrains Mono', monospace; font-size: 11px; opacity: 0.7; }
        .nav__label { font-family: 'Oswald', sans-serif; font-size: 14px; letter-spacing: 0.03em; }

        .sidebar__foot { margin-top: auto; padding: 0 6px; }
        .roster { display: flex; gap: 6px; margin-top: 10px; }

        /* ---------- generic bits ---------- */
        .btn {
          font-family: 'Oswald', sans-serif; letter-spacing: 0.04em; font-size: 13px;
          text-transform: uppercase; padding: 11px 20px; border-radius: 2px; cursor: pointer; border: 1px solid transparent;
        }
        .btn--primary { background: var(--cyan); color: #06181A; font-weight: 600; }
        .btn--primary:hover { filter: brightness(1.08); }
        .btn--primary:disabled { background: var(--panel-2); color: var(--paper-dim); cursor: not-allowed; }
        .btn--ghost { background: transparent; border-color: var(--line); color: var(--paper); }
        .btn--ghost.btn--amber { border-color: var(--amber); color: var(--amber); }
        .btn--ghost.btn--amber:hover { background: rgba(198,138,62,0.1); }

        .stamp {
          display: inline-block; font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 10px; border: 2px solid var(--stamp-color);
          color: var(--stamp-color); border-radius: 2px; opacity: 0.92; transform: rotate(-4deg);
        }
        .stamp--sm { font-size: 9.5px; padding: 2px 7px; }

        /* ---------- main ---------- */
        .main { flex: 1; padding: 34px 44px; max-width: 1180px; }

        /* ---------- briefing: case gallery ---------- */
        .briefing__intro { margin-bottom: 20px; }

        .folder-rail {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px;
        }
        .folder-card {
          all: unset; cursor: pointer; position: relative; height: 168px; border-radius: 4px 4px 2px 2px;
          overflow: hidden; border: 1px solid var(--line); display: flex; align-items: flex-end;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .folder-card:hover { transform: translateY(-3px); }
        .folder-card--active { border-color: var(--cyan); box-shadow: 0 0 0 1px var(--cyan); }
        .folder-card__tab {
          position: absolute; top: 0; right: 14px; font-family: 'JetBrains Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #06181A;
          background: var(--cyan); padding: 3px 8px 4px; border-radius: 0 0 3px 3px;
        }
        .folder-card__scrim { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(6,8,10,0.92) 10%, rgba(6,8,10,0.15) 70%); }
        .folder-card__body { position: relative; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
        .folder-card__title { font-family: 'Oswald', sans-serif; font-size: 16px; margin: 2px 0 0; color: var(--paper); }
        .folder-card__logline { font-size: 11.5px; line-height: 1.4; color: #C9C2B2; margin: 0; max-width: 240px; }

        .briefing__hero {
          position: relative; border-radius: 4px; overflow: hidden; min-height: 340px;
          display: flex; align-items: flex-end; border: 1px solid var(--line);
        }
        .briefing__vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 30%, transparent 30%, rgba(0,0,0,0.65) 100%); }
        .briefing__hero-inner { position: relative; padding: 40px; max-width: 620px; }
        .briefing__title { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 40px; line-height: 1.02; margin: 10px 0 16px; color: var(--paper); }
        .briefing__story { font-size: 15px; line-height: 1.65; color: #D8D2C4; max-width: 520px; margin: 0 0 22px; }

        .pill-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill {
          display: flex; align-items: center; gap: 8px; background: rgba(21,26,33,0.72); backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.08); padding: 8px 14px; border-radius: 20px;
        }
        .pill__k { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--paper-dim); text-transform: uppercase; letter-spacing: 0.08em; }
        .pill__v { font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600; color: var(--paper); }
        .pill--status .pill__dot { width: 7px; height: 7px; border-radius: 50%; }
        .pill--status .pill__v { text-transform: uppercase; }

        .briefing__footer { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; }

        /* ---------- evidence board: pinboard ---------- */
        .board__header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }

        .corkboard {
          border-radius: 6px; padding: 10px;
          background: linear-gradient(#3C2A1C, #2E2015);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04), 0 10px 30px rgba(0,0,0,0.4);
        }
        .corkboard__frame {
          position: relative; border-radius: 3px; padding: 34px 30px;
          background-color: var(--cork);
          background-image:
            radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1.4px),
            radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1.4px);
          background-size: 9px 9px, 13px 13px;
          background-position: 0 0, 4px 6px;
          display: flex; flex-wrap: wrap; gap: 26px 22px; align-content: flex-start;
          min-height: 420px;
        }

        .pin {
          all: unset; cursor: pointer; position: relative; transform: rotate(var(--rot));
          transition: transform 0.15s ease, filter 0.15s ease;
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45));
        }
        .pin:hover { transform: rotate(0deg) translateY(-3px) scale(1.02); filter: drop-shadow(0 10px 16px rgba(0,0,0,0.5)); }

        .pin__pin {
          position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
          width: 11px; height: 11px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #E7776B, #8C2A20 75%);
          box-shadow: 0 2px 3px rgba(0,0,0,0.5);
          z-index: 2;
        }

        /* document -> manila folder */
        .pin--folder {
          width: 168px; background: #D8C79B; border-radius: 2px; padding: 20px 12px 12px;
          display: flex; flex-direction: column; gap: 4px; text-align: left;
          box-shadow: 0 1px 0 rgba(255,255,255,0.3) inset;
        }
        .folder-tab {
          position: absolute; top: -10px; left: 14px; width: 52px; height: 12px;
          background: #D8C79B; border-radius: 3px 3px 0 0;
        }
        .pin--folder .pin__label { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 12.5px; color: #2A2013; }
        .pin--folder .pin__meta { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6B5A3A; text-transform: uppercase; letter-spacing: 0.06em; }

        /* testimony -> lined index card */
        .pin--index {
          width: 164px; background: #F1EAD6; border-radius: 1px; padding: 18px 14px 12px;
          display: flex; flex-direction: column; gap: 6px; text-align: left;
          background-image: repeating-linear-gradient(#F1EAD6 0 21px, #D9CDAE 21px 22px);
        }
        .pin--index .pin__quote { font-family: 'Oswald', sans-serif; font-size: 18px; color: var(--cyan); opacity: 0.7; }
        .pin--index .pin__label { font-family: 'Inter', sans-serif; font-size: 12.5px; color: #2A2013; font-weight: 500; }
        .pin--index .pin__meta { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #7A7060; }

        /* audio -> cassette sticker */
        .pin--cassette { width: 172px; }
        .cassette {
          background: #23262B; border-radius: 4px; padding: 12px 12px 10px; border: 1px solid #050607;
        }
        .cassette__window {
          background: #101215; border-radius: 3px; padding: 10px 14px; display: flex; justify-content: space-between; margin-bottom: 8px;
        }
        .cassette__reel {
          width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #6B7178 0 3px, #2A2D31 4px 8px, #101215 9px);
        }
        .cassette__label { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--amber); }

        /* image -> taped polaroid */
        .pin--polaroid { width: 148px; background: #F4F1E8; padding: 8px 8px 26px; border-radius: 1px; }
        .pin__photo { display: block; width: 132px; height: 110px; border-radius: 1px; }
        .pin__cap {
          position: absolute; bottom: 6px; left: 10px; right: 10px;
          font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #4A4433; text-align: left;
        }
        .pin__tape {
          position: absolute; width: 40px; height: 16px; background: rgba(236,228,211,0.55);
          box-shadow: 0 1px 2px rgba(0,0,0,0.25); z-index: 3;
        }
        .pin__tape--l { top: -8px; left: -6px; transform: rotate(-35deg); }
        .pin__tape--r { top: -8px; right: -6px; transform: rotate(35deg); }

        /* forensic -> lab tag with binder clip */
        .pin--lab {
          width: 158px; background: #1D2229; border: 1px solid var(--crimson); padding: 18px 12px 12px;
          display: flex; flex-direction: column; gap: 6px; text-align: left; border-radius: 2px;
        }
        .pin__clip {
          position: absolute; top: -9px; left: 50%; transform: translateX(-50%);
          width: 26px; height: 12px; border: 2px solid #8A8F99; border-bottom: none; border-radius: 4px 4px 0 0;
        }
        .pin--lab .pin__glyph { color: var(--crimson); font-size: 15px; }
        .pin--lab .pin__label { font-family: 'Inter', sans-serif; font-size: 12px; color: var(--paper); }
        .pin--lab .pin__meta { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: var(--crimson); text-transform: uppercase; }

        .modal-scrim {
          position: fixed; inset: 0; background: rgba(6,8,11,0.72); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        .modal { width: 440px; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 22px; }
        .modal__topline { display: flex; justify-content: space-between; align-items: center; }
        .modal__close { all: unset; cursor: pointer; color: var(--paper-dim); font-size: 14px; }
        .modal__title { font-family: 'Oswald', sans-serif; font-size: 20px; margin: 10px 0 16px; }
        .modal__preview {
          height: 150px; background: var(--panel-2); border: 1px dashed var(--line); border-radius: 3px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 14px; overflow: hidden;
        }
        .modal__photo { width: 100%; height: 100%; }
        .modal__glyph { font-size: 34px; color: var(--paper-dim); }
        .waveform { display: flex; align-items: center; gap: 14px; width: 100%; padding: 0 20px; }
        .waveform__play {
          all: unset; cursor: pointer; width: 38px; height: 38px; border-radius: 50%; background: var(--amber);
          color: #241703; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .waveform__bars { display: flex; align-items: flex-end; gap: 2px; flex: 1; height: 60px; }
        .waveform__bars span { width: 3px; background: var(--amber); opacity: 0.7; border-radius: 1px; }
        .modal__desc { font-size: 13px; line-height: 1.6; color: var(--paper-dim); margin: 0; }

        /* ---------- assessment ---------- */
        .persona {
          border: 1px solid var(--amber); background: linear-gradient(180deg, rgba(198,138,62,0.08), transparent);
          border-radius: 3px; padding: 16px 20px; margin-bottom: 26px;
        }
        .persona__head { display: flex; align-items: center; justify-content: space-between; }
        .persona__label { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--amber); letter-spacing: 0.08em; }
        .persona__body { margin-top: 12px; }
        .persona__text { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; color: #E8C892; margin: 0; }
        .persona__redacted { display: flex; flex-direction: column; gap: 8px; margin: 0; }
        .persona__redacted .bar { display: block; height: 10px; background: repeating-linear-gradient(90deg, #2A2015 0 6px, #221A10 6px 12px); border-radius: 1px; }

        .assessment__grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 22px; align-items: start; }
        .verdicts, .consensus { display: flex; flex-direction: column; gap: 14px; }

        .verdict-card { background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 18px 20px; }
        .verdict-card__head { display: flex; gap: 10px; margin-bottom: 14px; }
        .verdict-card__num {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--cyan); border: 1px solid var(--cyan);
          border-radius: 2px; padding: 1px 6px; height: fit-content;
        }
        .verdict-card__prompt { font-size: 14.5px; line-height: 1.5; margin: 0; color: var(--paper); }
        .verdict-card__choices { display: flex; flex-direction: column; gap: 8px; }
        .node {
          all: unset; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #C9C2B2;
          padding: 10px 12px; border: 1px solid var(--line); border-radius: 2px;
          transition: border-color 0.12s ease, color 0.12s ease, background 0.12s ease;
        }
        .node:hover { border-color: #465061; }
        .node__ring { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid var(--paper-dim); flex-shrink: 0; }
        .node--selected { border-color: var(--cyan); color: var(--paper); background: rgba(85,190,194,0.08); }
        .node--selected .node__ring { border-color: var(--cyan); background: var(--cyan); box-shadow: 0 0 6px var(--cyan); }

        .consensus-row { background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 16px 18px; }
        .consensus-row__prompt { margin: 0 0 12px; }
        .consensus-row__choices { display: flex; flex-direction: column; gap: 10px; }
        .consensus-slot { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
        .consensus-slot:last-child { border-bottom: none; padding-bottom: 0; }
        .consensus-slot__label { font-size: 12.5px; color: var(--paper-dim); }
        .consensus-slot__avatars { display: flex; }

        .player-chip {
          width: 26px; height: 26px; border-radius: 50%; background: var(--panel-2); border: 1.5px solid var(--line);
          display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace;
          font-size: 9px; color: var(--paper); margin-left: -6px;
        }
        .player-chip:first-child { margin-left: 0; }
        .player-chip--host { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }
        .player-chip--active { transform: translateY(-2px); }

        .submit-fab {
          all: unset; cursor: not-allowed; position: fixed; bottom: 34px; right: 44px;
          font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.06em; font-size: 13px;
          font-weight: 600; padding: 15px 26px; border-radius: 3px; background: var(--panel-2); color: var(--paper-dim);
          border: 1px solid var(--line);
        }
        .submit-fab--ready {
          cursor: pointer; background: var(--cyan); color: #06181A; border-color: var(--cyan);
          animation: pulse 2.1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(85,190,194,0.45); }
          50% { box-shadow: 0 0 0 9px rgba(85,190,194,0); }
        }

        @media (max-width: 920px) {
          .assessment__grid { grid-template-columns: 1fr; }
          .folder-rail { grid-template-columns: 1fr; }
          .app { flex-direction: column; }
          .sidebar { width: 100%; flex-direction: row; align-items: center; }
          .nav { flex-direction: row; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">CASE<span>FILE</span></span>
          <span className="brand__sub">investigation protocol v1</span>
        </div>

        <nav className="nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav__item ${tab === t.id ? "nav__item--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="nav__num">{t.num}</span>
              <span className="nav__label">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="mono-note">room roster</span>
          <div className="roster">
            {PLAYERS.map((p) => (
              <PlayerChip key={p.id} player={p} />
            ))}
          </div>
        </div>
      </aside>

      <main className="main">
        {tab === "briefing" && <BriefingRoom />}
        {tab === "evidence" && <EvidenceBoard />}
        {tab === "assessment" && <Assessment />}
      </main>
    </div>
  );
}
