import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, ArrowRight, BarChart3, BookOpen, Check, ChevronDown, CircleHelp,
  Clock3, Cpu, Gauge, Layers3, Play, Plus, RotateCcw, SkipBack, SkipForward, Sparkles,
  Terminal, Trophy, X, Zap,
} from "lucide-react";
import { SAMPLE_PROCESSES, simulate, validateProcesses } from "./scheduler.js";
import "./styles.css";

const ALGORITHMS = [
  { id: "FCFS", title: "First Come First Serve", short: "FCFS", description: "Run processes in the order they were entered, waiting if the next one has not arrived.", icon: Layers3, color: "cyan", mode: "Non-preemptive" },
  { id: "SJF", title: "Shortest Job First", short: "SJF", description: "Run the shortest available job to reduce average waiting time.", icon: Zap, color: "violet", mode: "Non-preemptive" },
  { id: "Round Robin", title: "Round Robin", short: "RR", description: "Scan in input order, giving each ready process one time quantum per pass.", icon: RotateCcw, color: "blue", mode: "Preemptive" },
  { id: "Priority", title: "Priority Scheduling", short: "PRIO", description: "Run the most important ready process first.", icon: Gauge, color: "pink", mode: "Non-preemptive" },
];
const COLORS = ["#54e5ed", "#a88bff", "#ffbc68", "#ff78b7", "#7da4ff", "#75e6a2", "#fb7c71", "#d1a2ff"];
const colorFor = (pid) => {
  const number = Number(String(pid).replace(/\D/g, "")) || 1;
  return COLORS[(number - 1) % COLORS.length];
};
const emptyProcess = (index) => ({ pid: `P${index + 1}`, arrival: 0, burst: 1, priority: 1 });

function App() {
  const [page, setPage] = useState("Dashboard");
  const [selected, setSelected] = useState("FCFS");
  const [processes, setProcesses] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gamex-processes") || "null");
      return Array.isArray(saved) && saved.length ? saved : SAMPLE_PROCESSES;
    } catch {
      return SAMPLE_PROCESSES;
    }
  });
  const [quantum, setQuantum] = useState(2);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [arena, setArena] = useState(null);
  const [arenaChoice, setArenaChoice] = useState("FCFS");
  const [whatIf, setWhatIf] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(850);
  const [step, setStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizDone, setQuizDone] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeChecked, setChallengeChecked] = useState(false);

  useEffect(() => {
    localStorage.setItem("gamex-processes", JSON.stringify(processes));
  }, [processes]);
  useEffect(() => {
    if (!playing || !result?.segments.length) return undefined;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= result.segments.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, result, speed]);

  const active = ALGORITHMS.find((algorithm) => algorithm.id === selected);
  const readyErrors = validateProcesses(processes, { requirePriority: selected === "Priority" });
  const currentTrace = result?.trace[Math.min(step, Math.max(0, (result?.trace.length || 1) - 1))];
  const currentSegment = result?.segments[step];

  function openSimulation(id) {
    setSelected(id);
    setResult(null);
    setError("");
    setPage("Simulation");
  }
  function updateProcess(index, key, value) {
    setProcesses((existing) => existing.map((process, i) => i === index ? { ...process, [key]: key === "pid" ? value : value === "" ? "" : Number(value) } : process));
    setResult(null);
    setArena(null);
    setError("");
  }
  function addProcess() {
    setProcesses((existing) => [...existing, emptyProcess(existing.length)]);
    setResult(null);
    setArena(null);
    setError("");
  }
  function removeProcess(index) {
    setProcesses((existing) => existing.filter((_, i) => i !== index));
    setResult(null);
    setArena(null);
    setError("");
  }
  function updateQuantum(value) {
    setQuantum(value === "" ? "" : Number(value));
    setResult(null);
    setArena(null);
  }
  function loadSample() {
    setProcesses(SAMPLE_PROCESSES.map((process) => ({ ...process })));
    setQuantum(2);
    setResult(null);
    setArena(null);
    setError("");
  }
  function resetInputs() {
    setProcesses([emptyProcess(0)]);
    setResult(null);
    setArena(null);
    setError("");
  }
  function runOne(id = selected, data = processes, q = quantum) {
    const issues = validateProcesses(data, { requirePriority: id === "Priority" });
    if (id === "Round Robin" && (!Number.isInteger(Number(q)) || Number(q) <= 0)) issues.push("Time quantum must be a whole number greater than 0.");
    if (issues.length) {
      setError(issues.join(" "));
      return null;
    }
    const calculated = simulate(data.map((p) => ({ ...p, arrival: Number(p.arrival), burst: Number(p.burst), priority: Number(p.priority) })), id, q);
    setError("");
    return calculated;
  }
  function runSimulation() {
    const calculated = runOne();
    if (calculated) {
      setResult(calculated);
      setStep(0);
      setPlaying(false);
      setPage("Simulation");
    }
  }
  function runArena() {
    const errors = validateProcesses(processes, { requirePriority: true });
    if (!Number.isInteger(Number(quantum)) || Number(quantum) <= 0) errors.push("Round Robin time quantum must be a whole number greater than 0.");
    if (errors.length) {
      setError(errors.join(" "));
      setArena(null);
      return;
    }
    const data = processes.map((p) => ({ ...p, arrival: Number(p.arrival), burst: Number(p.burst), priority: Number(p.priority) }));
    setArena(Object.fromEntries(ALGORITHMS.map((algorithm) => [algorithm.id, simulate(data, algorithm.id, quantum)])));
    setArenaChoice("FCFS");
    setError("");
  }
  function updateWhatIf(index, key, value) {
    const next = processes.map((p, i) => i === index ? { ...p, [key]: value === "" ? "" : key === "pid" ? value : Number(value) } : p);
    setProcesses(next);
    const issues = validateProcesses(next, { requirePriority: true });
    if (!Number.isInteger(Number(quantum)) || Number(quantum) <= 0) issues.push("Round Robin time quantum must be a whole number greater than 0.");
    if (issues.length) {
      setError(issues.join(" "));
      setArena(null);
      return;
    }
    const normalized = next.map((p) => ({ ...p, arrival: Number(p.arrival), burst: Number(p.burst), priority: Number(p.priority) }));
    setArena(Object.fromEntries(ALGORITHMS.map((algorithm) => [algorithm.id, simulate(normalized, algorithm.id, quantum)])));
    setError("");
  }
  function updateArenaQuantum(value) {
    const nextQuantum = value === "" ? "" : Number(value);
    setQuantum(nextQuantum);
    if (!whatIf) {
      setArena(null);
      return;
    }
    const issues = validateProcesses(processes, { requirePriority: true });
    if (!Number.isInteger(Number(nextQuantum)) || Number(nextQuantum) <= 0) issues.push("Round Robin time quantum must be a whole number greater than 0.");
    if (issues.length) {
      setError(issues.join(" "));
      setArena(null);
      return;
    }
    const normalized = processes.map((p) => ({ ...p, arrival: Number(p.arrival), burst: Number(p.burst), priority: Number(p.priority) }));
    setArena(Object.fromEntries(ALGORITHMS.map((algorithm) => [algorithm.id, simulate(normalized, algorithm.id, nextQuantum)])));
    setError("");
  }
  function changePage(nextPage) {
    setPage(nextPage);
    setError("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); changePage("Dashboard"); }}>
          <span className="brand-mark"><Cpu size={22} /></span>
          <span><b>gameX</b><small>CPU LAB // v1.0</small></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-links">
          {[
            ["Dashboard", Activity], ["Algorithms", Layers3], ["CPU Battle Arena", Trophy], ["Learn", BookOpen], ["About", CircleHelp],
          ].map(([label, Icon]) => (
            <button key={label} className={`nav-item ${page === label || (page === "Simulation" && label === "Algorithms") ? "active" : ""}`} onClick={() => changePage(label)}>
              <Icon size={17} /><span>{label}</span>{label === "CPU Battle Arena" && <span className="nav-hot">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-top"><span className="live-dot" /> SYSTEM ONLINE</div>
            <div className="system-meter"><i /></div>
            <div className="system-meta"><span>CPU LOAD</span><b>24.8%</b></div>
            <div className="system-meta"><span>SIM ENGINE</span><b className="green-text">READY</b></div>
          </div>
          <div className="profile"><div className="avatar">OS</div><div><b>Student mode</b><small>Local workspace</small></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>GAME X</span><i>/</i><b>{page === "Simulation" ? `${selected} SIMULATOR` : page.toUpperCase()}</b></div>
          <div className="top-actions"><div className="top-status"><span className="live-dot" /> All systems operational</div><button className="icon-button" title="About gameX" onClick={() => changePage("About")}><CircleHelp size={17} /></button></div>
        </header>
        {error && <div className="error-banner"><X size={16} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}
        {page === "Dashboard" && <Dashboard processes={processes} selected={selected} onOpen={openSimulation} setPage={changePage} />}
        {page === "Algorithms" && <Algorithms onOpen={openSimulation} />}
        {page === "Simulation" && <SimulationPage
          active={active} selected={selected} setSelected={setSelected} processes={processes}
          updateProcess={updateProcess} addProcess={addProcess} removeProcess={removeProcess}
          loadSample={loadSample} resetInputs={resetInputs} runSimulation={runSimulation}
          quantum={quantum} setQuantum={updateQuantum} result={result} playing={playing} setPlaying={setPlaying}
          step={step} setStep={setStep} speed={speed} setSpeed={setSpeed} currentTrace={currentTrace}
          currentSegment={currentSegment} readyErrors={readyErrors}
        />}
        {page === "CPU Battle Arena" && <ArenaPage
          processes={processes} setProcesses={setProcesses} quantum={quantum} setQuantum={setQuantum}
          arena={arena} runArena={runArena} arenaChoice={arenaChoice} setArenaChoice={setArenaChoice}
          whatIf={whatIf} setWhatIf={setWhatIf} updateWhatIf={updateWhatIf} openSimulation={openSimulation}
          setError={setError} loadSample={loadSample} updateArenaQuantum={updateArenaQuantum}
        />}
        {page === "Learn" && <LearnPage quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} quizDone={quizDone} setQuizDone={setQuizDone} challengeAnswer={challengeAnswer} setChallengeAnswer={setChallengeAnswer} challengeChecked={challengeChecked} setChallengeChecked={setChallengeChecked} />}
        {page === "About" && <AboutPage />}
      </main>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, right }) {
  return <div className="page-title"><div><div className="eyebrow"><span />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{right}</div>;
}

function Dashboard({ processes, selected, onOpen, setPage }) {
  return <div className="content">
    <PageTitle eyebrow="OPERATING SYSTEMS / INTERACTIVE LAB" title={<>CPU Scheduling <span className="gradient-text">Simulator</span></>} description="Visualize. Simulate. Optimize. Explore how the operating system decides who gets the CPU." right={<div className="title-chip"><span className="live-dot" /> INTERACTIVE ENVIRONMENT</div>} />
    <section className="hero-panel">
      <div className="hero-copy"><div className="hero-kicker"><Sparkles size={14} /> THE SCHEDULER IS YOURS TO CONTROL</div><h2>Make every<br /><span>CPU cycle count.</span></h2><p>Give your processes a run. Compare scheduling strategies, trace every decision, and see the math behind the timeline.</p><div className="hero-buttons"><button className="button primary" onClick={() => onOpen("FCFS")}><Play size={15} fill="currentColor" /> Start simulating <ArrowRight size={15} /></button><button className="button quiet" onClick={() => setPage("Learn")}><BookOpen size={15} /> Explore the concepts</button></div></div>
      <div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="cpu-chip"><Cpu size={44} /><span>CPU</span><small>CORE 01</small></div><div className="floating-process fp-one"><i style={{ background: COLORS[0] }} />P1 <span>RUNNING</span></div><div className="floating-process fp-two"><i style={{ background: COLORS[1] }} />P2 <span>READY</span></div><div className="floating-process fp-three"><i style={{ background: COLORS[2] }} />P3 <span>WAITING</span></div><div className="hero-telemetry"><span>QUEUE DEPTH</span><b>{processes.length.toString().padStart(2, "0")}</b><small>PROCESS BUFFER</small></div></div>
    </section>
    <div className="section-heading"><div><div className="eyebrow"><span /> CHOOSE YOUR ALGORITHM</div><h2>Four ways to schedule</h2></div><button className="text-link" onClick={() => setPage("Algorithms")}>All algorithms <ArrowRight size={15} /></button></div>
    <div className="algorithm-grid">
      {ALGORITHMS.map((algorithm, index) => <AlgorithmCard key={algorithm.id} algorithm={algorithm} index={index} onOpen={onOpen} />)}
    </div>
    <div className="dashboard-bottom">
      <div className="panel status-panel"><div className="panel-header"><div><div className="eyebrow"><span /> LIVE CPU STATUS</div><h3>System overview</h3></div><span className="status-pill"><span className="live-dot" /> ONLINE</span></div><div className="status-grid"><div className="status-stat"><span>CPU STATE</span><b className="state-ready"><i /> Ready</b><small>Waiting for workload</small></div><div className="status-stat"><span>PROCESSES</span><b>{String(processes.length).padStart(2, "0")}</b><small>In current dataset</small></div><div className="status-stat"><span>SELECTED ALGORITHM</span><b>{selected}</b><small>Last selected</small></div></div><div className="core-strip"><div className="core-icon"><Cpu size={19} /></div><div><b>CPU Core 01</b><small>4 scheduling strategies available</small></div><div className="core-activity">{[32, 56, 40, 74, 46, 68, 36, 58, 82, 45, 64, 39, 70, 51, 34, 61, 46, 76].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div></div>
      <button className="panel arena-promo" onClick={() => setPage("CPU Battle Arena")}><div className="arena-icon"><Trophy size={21} /></div><div className="eyebrow"><span /> FEATURED MODE</div><h3>CPU Battle Arena</h3><p>Put all four schedulers head-to-head on the same workload.</p><span className="arena-cta">Enter the arena <ArrowRight size={15} /></span><div className="promo-decoration">VS</div></button>
    </div>
  </div>;
}

function AlgorithmCard({ algorithm, index, onOpen }) {
  const Icon = algorithm.icon;
  return <article className={`algorithm-card ${algorithm.color}`} style={{ animationDelay: `${index * 70}ms` }}>
    <div className="card-top"><span className="algo-icon"><Icon size={19} /></span><span className="mode-tag">{algorithm.mode}</span></div>
    <div className="algo-short">{algorithm.short}</div><h3>{algorithm.title}</h3><p>{algorithm.description}</p>
    <button className="card-start" onClick={() => onOpen(algorithm.id)}>Start simulation <ArrowRight size={15} /></button>
  </article>;
}

function Algorithms({ onOpen }) {
  return <div className="content"><PageTitle eyebrow="SCHEDULING TOOLKIT" title="Choose a strategy." description="Each algorithm makes a different trade-off between fairness, responsiveness, and throughput." />
    <div className="algorithm-grid expanded-grid">{ALGORITHMS.map((algorithm, index) => <AlgorithmCard key={algorithm.id} algorithm={algorithm} index={index} onOpen={onOpen} />)}</div>
    <div className="panel algorithm-note"><div className="note-icon"><CircleHelp size={20} /></div><div><h3>Preemptive vs. non-preemptive</h3><p>FCFS, SJF, and Priority here are non-preemptive: once a process starts, it runs to completion. Round Robin is preemptive: the CPU switches after each time quantum, keeping the system responsive.</p></div></div>
  </div>;
}

function SimulationPage({ active, selected, setSelected, processes, updateProcess, addProcess, removeProcess, loadSample, resetInputs, runSimulation, quantum, setQuantum, result, playing, setPlaying, step, setStep, speed, setSpeed, currentTrace, currentSegment, readyErrors }) {
  return <div className="content">
    <PageTitle eyebrow="SCHEDULATOR / CONFIGURATION" title={<>{active?.short || selected} <span className="gradient-text">Simulation</span></>} description={`${active?.mode || "Scheduling"} scheduling · ${active?.description || ""}`} right={<select className="select-algorithm" value={selected} onChange={(e) => setSelected(e.target.value)}>{ALGORITHMS.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>} />
    <div className="sim-layout">
      <div className="sim-main">
        <section className="panel input-panel"><div className="panel-header"><div><div className="eyebrow"><span /> WORKLOAD CONFIGURATION</div><h3>Process table</h3></div><span className="subtle-tag"><Terminal size={13} /> MANUAL INPUT</span></div>
          <div className="table-wrap"><table className="process-table"><thead><tr><th>PROCESS ID</th><th>ARRIVAL (AT)</th><th>BURST (BT)</th>{selected === "Priority" && <th>PRIORITY</th>}<th /></tr></thead><tbody>{processes.map((process, index) => <tr key={`${index}-${process.pid}`}><td><span className="pid-cell"><i style={{ background: colorFor(process.pid) }} /><input aria-label={`Process ${index + 1} ID`} value={process.pid} onChange={(e) => updateProcess(index, "pid", e.target.value)} /></span></td><td><input type="number" min="0" aria-label={`${process.pid} arrival time`} value={process.arrival} onChange={(e) => updateProcess(index, "arrival", e.target.value)} /></td><td><input type="number" min="1" aria-label={`${process.pid} burst time`} value={process.burst} onChange={(e) => updateProcess(index, "burst", e.target.value)} /></td>{selected === "Priority" && <td><input type="number" aria-label={`${process.pid} priority`} value={process.priority} onChange={(e) => updateProcess(index, "priority", e.target.value)} /></td>}<td><button className="remove-button" title={`Remove ${process.pid}`} onClick={() => removeProcess(index)}><X size={15} /></button></td></tr>)}</tbody></table></div>
          <div className="table-actions"><button className="small-action" onClick={addProcess}><Plus size={14} /> Add process</button><button className="small-action" onClick={loadSample}><Layers3 size={14} /> Load sample</button><button className="small-action muted-action" onClick={resetInputs}><RotateCcw size={14} /> Reset</button></div>
          {selected === "Round Robin" && <div className="quantum-field"><label htmlFor="quantum">TIME QUANTUM</label><div><input id="quantum" type="number" min="1" value={quantum} onChange={(e) => setQuantum(e.target.value === "" ? "" : Number(e.target.value))} /><span>time units</span></div><small>Each pass scans processes in input order and gives every ready process up to this many time units.</small></div>}
          {selected === "Priority" && <div className="priority-hint"><Zap size={14} /> Smaller priority numbers indicate higher priority.</div>}
          {readyErrors.length > 0 && <div className="input-hint"><CircleHelp size={14} /> Burst time must be &gt; 0 · Arrival time must be ≥ 0 · IDs must be unique.</div>}
          <button className="button primary run-button" onClick={runSimulation}><Play size={15} fill="currentColor" /> Run simulation <ArrowRight size={15} /></button>
        </section>
        {result && <Results result={result} step={step} playing={playing} setPlaying={setPlaying} setStep={setStep} speed={speed} setSpeed={setSpeed} currentTrace={currentTrace} currentSegment={currentSegment} />}
      </div>
      <aside className="sim-aside"><div className="panel mini-status"><div className="eyebrow"><span /> SIMULATION STATUS</div><div className="mini-cpu"><Cpu size={27} /><div><b>{result ? "COMPLETE" : "STANDBY"}</b><small>{result ? `${result.segments.length} execution segments` : "Ready for input"}</small></div></div><div className="mini-status-row"><span>ALGORITHM</span><b>{selected}</b></div><div className="mini-status-row"><span>PROCESS COUNT</span><b>{String(processes.length).padStart(2, "0")}</b></div><div className="mini-status-row"><span>MODE</span><b>{selected === "Round Robin" ? "PREEMPTIVE" : "NON-PREEMPTIVE"}</b></div></div>
        <div className="panel formula-panel"><div className="eyebrow"><span /> METRIC FORMULAS</div><h3>How results are calculated</h3><Formula label="Turnaround" formula="CT − AT" /><Formula label="Waiting" formula="TAT − BT" /><Formula label="Response" formula="First Start − AT" /><Formula label="CPU Utilization" formula="Busy ÷ Observation × 100" /><p className="formula-foot">Observation interval: first arrival → final completion.</p></div>
        <div className="tip-card"><Sparkles size={16} /><div><b>Learning tip</b><p>Try moving one arrival time later. Watch how the ready queue and CPU idle time change.</p></div></div>
      </aside>
    </div>
  </div>;
}

function Formula({ label, formula }) {
  return <div className="formula-row"><span>{label}</span><code>{formula}</code></div>;
}

function Results({ result, step, playing, setPlaying, setStep, speed, setSpeed, currentTrace, currentSegment }) {
  const { metrics } = result;
  const maxTime = Math.max(...result.segments.map((segment) => segment.end), 1);
  return <section className="panel results-panel"><div className="panel-header"><div><div className="eyebrow"><span /> EXECUTION OUTPUT</div><h3>Results & timeline <span className="result-algo">{result.algorithm}</span></h3></div><span className="status-pill"><Check size={12} /> CALCULATED</span></div>
    <div className="gantt-top"><div><b>Gantt chart</b><small>Hover a block for execution details</small></div><div className="gantt-legend"><span><i className="busy-dot" /> Process</span><span><i className="idle-dot" /> CPU idle</span></div></div>
    <div className="gantt-viewport"><div className="gantt-track">{result.segments.map((segment, i) => <div key={`${segment.pid}-${i}`} className={`gantt-segment ${segment.pid === "IDLE" ? "idle-segment" : ""} ${i <= step ? "revealed" : "concealed"} ${i === step ? "current-segment" : ""}`} style={{ width: `${Math.max(segment.duration / maxTime * 100, 2)}%`, "--process-color": segment.pid === "IDLE" ? "#586176" : colorFor(segment.pid) }} title={`${segment.pid} · ${segment.start}–${segment.end} · ${segment.duration} time unit(s)`}><span>{segment.pid}</span></div>)}</div><div className="gantt-times">{result.segments.map((segment, i) => <span key={`${segment.start}-${i}`} style={{ left: `${segment.start / maxTime * 100}%` }}>{segment.start}</span>)}<span className="end-time">{maxTime}</span></div></div>
    <div className="timeline-controls"><button className={`control-button play-control ${playing ? "is-playing" : ""}`} title={playing ? "Pause" : "Play"} onClick={() => { if (step >= result.segments.length - 1) setStep(0); setPlaying(!playing); }}>{playing ? "Ⅱ" : <Play size={13} fill="currentColor" />}</button><button className="control-button" title="Step backward" onClick={() => { setPlaying(false); setStep(Math.max(0, step - 1)); }}><SkipBack size={14} /></button><button className="control-button" title="Step forward" onClick={() => { setPlaying(false); setStep(Math.min(result.segments.length - 1, step + 1)); }}><SkipForward size={14} /></button><button className="control-button" title="Restart" onClick={() => { setPlaying(false); setStep(0); }}><RotateCcw size={14} /></button><input className="timeline-slider" aria-label="Simulation timeline" type="range" min="0" max={Math.max(result.segments.length - 1, 0)} value={Math.min(step, result.segments.length - 1)} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} /><label className="speed-select">SPEED <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="1400">0.5×</option><option value="850">1×</option><option value="400">2×</option></select></label></div>
    <div className="metrics-grid">{[
      ["AVG WAITING", metrics.averageWaiting, "time units", "cyan"],
      ["AVG TURNAROUND", metrics.averageTurnaround, "time units", "violet"],
      ["AVG RESPONSE", metrics.averageResponse, "time units", "blue"],
      ["CPU UTILIZATION", `${metrics.utilization.toFixed(1)}%`, `${metrics.busyTime} busy units`, "pink"],
    ].map(([label, value, unit, color]) => <div className={`metric-card ${color}`} key={label}><span>{label}</span><b>{typeof value === "number" ? value.toFixed(2) : value}</b><small>{unit}</small></div>)}</div>
    <div className="extra-metrics"><div><span>TOTAL EXECUTION TIME</span><b>{metrics.makespan} <small>units</small></b></div><div><span>CPU IDLE TIME</span><b>{metrics.idleTime} <small>units</small></b></div><div><span>OBSERVATION INTERVAL</span><b>{metrics.firstArrival} → {metrics.makespan}</b></div></div>
    <div className="table-wrap result-table-wrap"><table className="process-table result-table"><thead><tr><th>PID</th><th>AT</th><th>BT</th>{result.algorithm === "Priority" && <th>PRIORITY</th>}<th>CT</th><th>TAT</th><th>WT</th><th>RT</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.pid}><td><span className="pid-cell"><i style={{ background: colorFor(row.pid) }} />{row.pid}</span></td><td>{row.arrival}</td><td>{row.burst}</td>{result.algorithm === "Priority" && <td>{row.priority}</td>}<td>{row.completion}</td><td>{row.turnaround}</td><td>{row.waiting}</td><td>{row.response}</td></tr>)}</tbody></table></div>
    <div className="time-machine"><div className="tm-icon"><Clock3 size={17} /></div><div className="tm-content"><div className="tm-head"><b>CPU Time Machine</b><span>EVENT {String(step + 1).padStart(2, "0")} / {String(result.segments.length).padStart(2, "0")}</span></div><p>{currentTrace?.explanation || `${currentSegment?.pid || "CPU"} executed from ${currentSegment?.start} to ${currentSegment?.end}.`}</p><div className="tm-state"><span>TIME <b>{currentSegment?.end ?? 0}</b></span><span>RUNNING <b>{currentSegment?.pid || "—"}</b></span><span>READY QUEUE <b>{currentTrace?.ready?.join(" → ") || "Empty"}</b></span><span>REMAINING <b>{currentTrace?.remaining?.join(", ") || "None"}</b></span><span>COMPLETED <b>{currentTrace?.completed?.join(", ") || "None"}</b></span></div><div className="tm-next"><span>NEXT SCHEDULING DECISION</span><b>{result.trace[step + 1]?.explanation || "All processes have completed."}</b></div></div></div>
    <div className="calculation-note"><BarChart3 size={15} /><span>Example: {result.rows[0].pid} TAT = CT ({result.rows[0].completion}) − AT ({result.rows[0].arrival}) = <b>{result.rows[0].turnaround}</b>; WT = TAT − BT = <b>{result.rows[0].waiting}</b>.</span></div>
  </section>;
}

function ArenaPage({ processes, quantum, setQuantum, arena, runArena, arenaChoice, setArenaChoice, whatIf, setWhatIf, updateWhatIf, openSimulation, setError, loadSample, updateArenaQuantum }) {
  const bestWaiting = arena && Object.keys(arena).reduce((best, key) => arena[key].metrics.averageWaiting < arena[best].metrics.averageWaiting ? key : best, "FCFS");
  const bestTurnaround = arena && Object.keys(arena).reduce((best, key) => arena[key].metrics.averageTurnaround < arena[best].metrics.averageTurnaround ? key : best, "FCFS");
  const colors = { FCFS: "cyan", SJF: "violet", "Round Robin": "blue", Priority: "pink" };
  return <div className="content"><PageTitle eyebrow="HEAD-TO-HEAD PERFORMANCE LAB" title={<>CPU Battle <span className="gradient-text">Arena</span></>} description="Same workload. Four schedulers. Which strategy comes out on top?" right={<div className="title-chip"><Trophy size={14} /> LIVE COMPARISON</div>} />
    <div className="arena-controls panel"><div className="arena-control-copy"><div className="eyebrow"><span /> SHARED WORKLOAD</div><h3>One dataset, four contenders.</h3><p>All algorithms use the exact same process inputs for a fair comparison.</p></div><div className="arena-control-actions"><button className="small-action" onClick={loadSample}><Layers3 size={14} /> Load sample</button><label className="quantum-inline">RR QUANTUM <input type="number" min="1" value={quantum} onChange={(e) => updateArenaQuantum(e.target.value)} /></label><button className="button primary" onClick={runArena}><Zap size={15} /> Run the battle</button></div></div>
    <div className="arena-inputs panel"><div className="panel-header"><div><div className="eyebrow"><span /> PROCESS DATASET</div><h3>Configure contenders</h3></div><button className={`whatif-toggle ${whatIf ? "on" : ""}`} onClick={() => setWhatIf(!whatIf)}><Sparkles size={14} /> What If? <span>{whatIf ? "ON" : "OFF"}</span></button></div>
      {whatIf && <div className="whatif-note"><Sparkles size={15} /> Edit any value below to instantly recalculate the arena. Comparison uses this updated dataset.</div>}
      <div className="table-wrap"><table className="process-table"><thead><tr><th>PROCESS ID</th><th>ARRIVAL (AT)</th><th>BURST (BT)</th><th>PRIORITY</th>{whatIf && <th>EDIT</th>}</tr></thead><tbody>{processes.map((process, index) => <tr key={`${index}-${process.pid}`}><td><span className="pid-cell"><i style={{ background: colorFor(process.pid) }} />{whatIf ? <input value={process.pid} onChange={(e) => updateWhatIf(index, "pid", e.target.value)} /> : process.pid}</span></td>{["arrival", "burst", "priority"].map((key) => <td key={key}>{whatIf ? <input type="number" min={key === "arrival" ? "0" : key === "burst" ? "1" : undefined} value={process[key]} onChange={(e) => updateWhatIf(index, key, e.target.value)} /> : process[key]}</td>)}{whatIf && <td className="whatif-hint">editable</td>}</tr>)}</tbody></table></div><div className="arena-dataset-foot"><span><span className="live-dot" /> {processes.length} processes in shared dataset</span><span>Priority: smaller number = higher priority</span></div>
    </div>
    {arena ? <>
      <div className="arena-winners"><div><Trophy size={19} /><span><small>LOWEST AVG WAITING</small><b>{bestWaiting}</b></span><strong>{arena[bestWaiting].metrics.averageWaiting.toFixed(2)} <small>units</small></strong></div><div><Sparkles size={19} /><span><small>LOWEST AVG TURNAROUND</small><b>{bestTurnaround}</b></span><strong>{arena[bestTurnaround].metrics.averageTurnaround.toFixed(2)} <small>units</small></strong></div></div>
      <div className="section-heading arena-heading"><div><div className="eyebrow"><span /> PERFORMANCE BREAKDOWN</div><h2>Four algorithms. One winner?</h2></div><span className="subtle-tag"><Activity size={13} /> METRICS FROM IDENTICAL INPUTS</span></div>
      <div className="arena-cards">{ALGORITHMS.map((algorithm) => { const metrics = arena[algorithm.id].metrics; return <button key={algorithm.id} className={`arena-card ${colors[algorithm.id]} ${arenaChoice === algorithm.id ? "selected" : ""}`} onClick={() => setArenaChoice(algorithm.id)}><div className="arena-card-top"><span>{algorithm.short}</span>{algorithm.id === bestWaiting && <small><Trophy size={11} /> BEST WAIT</small>}</div><b className="arena-algo-name">{algorithm.title}</b><div className="arena-card-metric"><span>Avg waiting</span><b>{metrics.averageWaiting.toFixed(2)}</b></div><div className="arena-card-metric"><span>Avg turnaround</span><b>{metrics.averageTurnaround.toFixed(2)}</b></div><div className="arena-card-metric"><span>Avg response</span><b>{metrics.averageResponse.toFixed(2)}</b></div><div className="arena-util"><span>CPU utilization</span><div className="util-bar"><i style={{ width: `${Math.min(metrics.utilization, 100)}%` }} /></div><b>{metrics.utilization.toFixed(1)}%</b></div><span className="view-details">View Gantt & calculations <ArrowRight size={13} /></span></button>; })}</div>
      <div className="arena-chart panel"><div className="panel-header"><div><div className="eyebrow"><span /> COMPARISON CHART</div><h3>Average waiting time</h3></div><span className="chart-unit">TIME UNITS · LOWER IS BETTER</span></div><div className="bar-chart">{ALGORITHMS.map((algorithm) => { const value = arena[algorithm.id].metrics.averageWaiting; const max = Math.max(...ALGORITHMS.map((item) => arena[item.id].metrics.averageWaiting), 1); return <button key={algorithm.id} className={`bar-row ${arenaChoice === algorithm.id ? "focused" : ""}`} onClick={() => setArenaChoice(algorithm.id)}><span>{algorithm.short}</span><div><i style={{ width: `${Math.max(value / max * 100, 1)}%`, background: `var(--${colors[algorithm.id]})` }} /></div><b>{value.toFixed(2)}</b></button>; })}</div></div>
      <div className="panel arena-detail"><div className="panel-header"><div><div className="eyebrow"><span /> SELECTED RUN</div><h3>{arenaChoice} detailed timeline</h3></div><button className="text-link" onClick={() => openSimulation(arenaChoice)}>Open full simulator <ArrowRight size={14} /></button></div><div className="gantt-track arena-gantt">{arena[arenaChoice].segments.map((segment, index) => <div key={`${segment.pid}-${index}`} className={`gantt-segment ${segment.pid === "IDLE" ? "idle-segment" : ""}`} style={{ width: `${Math.max(segment.duration / Math.max(arena[arenaChoice].metrics.makespan, 1) * 100, 2)}%`, "--process-color": segment.pid === "IDLE" ? "#586176" : colorFor(segment.pid) }} title={`${segment.pid}: ${segment.start}–${segment.end}`}><span>{segment.pid}</span></div>)}</div><div className="arena-detail-stats"><span>Avg waiting <b>{arena[arenaChoice].metrics.averageWaiting.toFixed(2)}</b></span><span>Avg turnaround <b>{arena[arenaChoice].metrics.averageTurnaround.toFixed(2)}</b></span><span>Avg response <b>{arena[arenaChoice].metrics.averageResponse.toFixed(2)}</b></span><span>CPU idle <b>{arena[arenaChoice].metrics.idleTime}</b></span></div></div>
      <div className="arena-disclaimer"><CircleHelp size={15} /> There is no universal winner: the best algorithm depends on the workload and the performance objective you care about.</div>
    </> : <div className="arena-empty panel"><div className="arena-empty-icon"><Trophy size={27} /></div><h3>Ready when you are.</h3><p>Enter priorities and a Round Robin quantum, then run the battle to compare all four schedulers.</p><button className="button primary" onClick={runArena}><Play size={14} fill="currentColor" /> Compare algorithms</button></div>}
  </div>;
}

const QUIZ = { question: "Which algorithm gives each ready process a fixed time slice in rotation?", answers: ["FCFS", "Non-preemptive SJF", "Round Robin", "Priority Scheduling"], correct: 2 };
function LearnPage({ quizAnswer, setQuizAnswer, quizDone, setQuizDone, challengeAnswer, setChallengeAnswer, challengeChecked, setChallengeChecked }) {
  const [learnTab, setLearnTab] = useState("Algorithms");
  const challengeOptions = ["P1", "P2", "P3"];
  return <div className="content"><PageTitle eyebrow="OPERATING SYSTEMS / FIELD GUIDE" title={<>Learn the <span className="gradient-text">scheduler.</span></>} description="Build intuition for the policies behind every CPU handoff." />
    <div className="learn-tabs">{["Algorithms", "Metrics", "Practice"].map((tab) => <button key={tab} className={learnTab === tab ? "active" : ""} onClick={() => setLearnTab(tab)}>{tab}</button>)}</div>
    {learnTab === "Algorithms" && <><div className="learn-grid">{ALGORITHMS.map((a) => <article className={`learn-card ${a.color}`} key={a.id}><div className="algo-icon"><a.icon size={19} /></div><span className="mode-tag">{a.mode}</span><h3>{a.title}</h3><p>{a.description}</p><div className="pros-cons"><div><b>ADVANTAGE</b><span>{a.id === "FCFS" ? "Easy to understand and follows the entered order." : a.id === "SJF" ? "Minimizes average waiting when bursts are known." : a.id === "Round Robin" ? "Provides regular time slices in an input-order pass." : "Important tasks can run sooner."}</span></div><div><b>TRADE-OFF</b><span>{a.id === "FCFS" ? "Out-of-arrival-order inputs can leave ready processes waiting." : a.id === "SJF" ? "Long jobs may starve; burst time is hard to predict." : a.id === "Round Robin" ? "Quantum size and input order affect turn sequence." : "Low-priority jobs may starve."}</span></div></div></article>)}</div><div className="panel concept-panel"><div className="concept-visual"><div className="concept-core"><Cpu size={27} /></div><ArrowRight size={18} /><div className="concept-queue"><i>P1</i><i>P2</i><i>P3</i></div></div><div><div className="eyebrow"><span /> CORE CONCEPT</div><h3>Preemptive vs. non-preemptive</h3><p>A <b>non-preemptive</b> scheduler lets a running process finish its CPU burst before switching. A <b>preemptive</b> scheduler can pause a process and give the CPU to another, as Round Robin does when its time quantum expires.</p></div></div></>}
    {learnTab === "Metrics" && <><div className="metric-explain-grid">{[["Completion Time (CT)", "The time when a process finishes execution."], ["Turnaround (TAT)", "Total time from arrival until completion. CT − AT."], ["Waiting (WT)", "Time spent waiting in the ready queue. TAT − BT."], ["Response (RT)", "Time until the process first gets CPU. First Start − AT."], ["CPU Utilization", "Busy time divided by observation interval × 100."], ["Makespan", "Final completion timestamp of the whole workload."]].map(([title, text], i) => <div className="metric-explain panel" key={title}><span className="metric-index">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><div className="worked-example panel"><div className="eyebrow"><span /> WORKED EXAMPLE · FCFS</div><h3>Turn the schedule into metrics</h3><div className="example-processes"><span>P1 <small>AT 0 · BT 4</small></span><span>P2 <small>AT 1 · BT 3</small></span></div><div className="gantt-track example-gantt"><div className="gantt-segment" style={{ width: "57%", "--process-color": COLORS[0] }}><span>P1</span></div><div className="gantt-segment" style={{ width: "43%", "--process-color": COLORS[1] }}><span>P2</span></div></div><p>P1 runs from 0–4, then P2 runs from 4–7. For P2: CT = 7, TAT = 7 − 1 = <b>6</b>, WT = 6 − 3 = <b>3</b>, RT = 4 − 1 = <b>3</b>.</p></div></>}
    {learnTab === "Practice" && <div className="practice-grid"><div className="panel quiz-card"><div className="eyebrow"><span /> QUICK QUIZ</div><h3>{QUIZ.question}</h3><div className="quiz-options">{QUIZ.answers.map((answer, index) => <button key={answer} className={`${quizAnswer === index ? "chosen" : ""} ${quizDone && index === QUIZ.correct ? "correct" : ""}`} onClick={() => { setQuizAnswer(index); setQuizDone(false); }}>{String.fromCharCode(65 + index)} <span>{answer}</span>{quizDone && index === QUIZ.correct && <Check size={15} />}</button>)}</div><button className="button primary" disabled={quizAnswer === null} onClick={() => setQuizDone(true)}>Check answer <ArrowRight size={14} /></button>{quizDone && <p className={`quiz-feedback ${quizAnswer === QUIZ.correct ? "good" : "bad"}`}>{quizAnswer === QUIZ.correct ? "Correct! Each process gets a turn in a repeating queue." : "Not quite. Think of the algorithm that rotates through the ready queue."}</p>}</div>
      <div className="panel challenge-card"><div className="eyebrow"><span /> PREDICT THE NEXT PROCESS</div><h3>Who runs next?</h3><p>Non-preemptive SJF · Current time = 3 · CPU is idle</p><div className="challenge-process-list"><span>P1 <small>AT 0 · BT 6</small></span><span>P2 <small>AT 1 · BT 2</small></span><span>P3 <small>AT 3 · BT 4</small></span></div><div className="challenge-options">{challengeOptions.map((pid) => <button key={pid} className={`${challengeAnswer === pid ? "chosen" : ""} ${challengeChecked && pid === "P2" ? "correct" : ""}`} onClick={() => { setChallengeAnswer(pid); setChallengeChecked(false); }}>{pid}</button>)}</div><button className="button secondary" disabled={!challengeAnswer} onClick={() => setChallengeChecked(true)}>Lock prediction <Check size={14} /></button>{challengeChecked && <p className={`quiz-feedback ${challengeAnswer === "P2" ? "good" : "bad"}`}>{challengeAnswer === "P2" ? "Correct! P2 arrived first and has the shortest available burst." : "P2 is the answer: at time 3, all three have arrived, and P2 has the shortest burst (2)."}</p>}</div>
      </div>}
  </div>;
}

function AboutPage() {
  return <div className="content"><PageTitle eyebrow="ABOUT THIS PROJECT" title={<>Built for <span className="gradient-text">curiosity.</span></>} description="A hands-on operating systems lab that makes CPU scheduling visible, interactive, and easier to understand." />
    <div className="about-hero panel"><div className="about-mark"><Cpu size={38} /></div><div><div className="eyebrow"><span /> GAME X · CPU LAB</div><h2>Visualize. Simulate. Optimize.</h2><p>gameX is a browser-based CPU scheduling simulator for operating systems students. Configure workloads, see the timeline, inspect scheduling decisions, and compare policies side by side — no backend required.</p></div></div>
    <div className="about-features">{[["Four scheduling strategies", "FCFS, non-preemptive SJF, Round Robin, and non-preemptive Priority."], ["Decision-level walkthrough", "Playback controls and a CPU Time Machine reveal how the timeline unfolds."], ["Private by design", "Your working process dataset is saved only in this browser's local storage."], ["Designed for learning", "Explore formulas, worked examples, a quick quiz, and a prediction challenge."]].map(([title, desc], i) => <div className="panel about-feature" key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{desc}</p></div>)}</div>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
