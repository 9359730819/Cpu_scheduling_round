function makeProcessRows(processes) {
  return processes.map((process, index) => ({
    ...process,
    index,
    remaining: process.burst,
    firstStart: null,
    completion: null,
  }));
}

function appendIdle(segments, from, to) {
  if (to > from) segments.push({ pid: "IDLE", start: from, end: to, duration: to - from });
}

function addSegment(segments, process, start, end) {
  segments.push({
    pid: process.pid,
    start,
    end,
    duration: end - start,
    processIndex: process.index,
  });
}

function finishResult(processes, segments, trace, algorithm) {
  const rows = processes.map((process) => {
    const turnaround = process.completion - process.arrival;
    return {
      pid: process.pid,
      arrival: process.arrival,
      burst: process.burst,
      priority: process.priority,
      completion: process.completion,
      turnaround,
      waiting: turnaround - process.burst,
      response: process.firstStart - process.arrival,
      firstStart: process.firstStart,
      index: process.index,
    };
  });
  const firstArrival = Math.min(...rows.map((row) => row.arrival));
  const finalCompletion = Math.max(...rows.map((row) => row.completion));
  const busyTime = rows.reduce((sum, row) => sum + row.burst, 0);
  const observationTime = finalCompletion - firstArrival;
  const average = (key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  return {
    algorithm,
    rows,
    segments,
    trace,
    metrics: {
      averageWaiting: average("waiting"),
      averageTurnaround: average("turnaround"),
      averageResponse: average("response"),
      makespan: finalCompletion,
      busyTime,
      idleTime: Math.max(0, observationTime - busyTime),
      utilization: observationTime === 0 ? 0 : (busyTime / observationTime) * 100,
      firstArrival,
      observationTime,
    },
  };
}

export function validateProcesses(processes, { requirePriority = false } = {}) {
  const errors = [];
  if (!processes.length) errors.push("Add at least one process before running a simulation.");
  const ids = new Set();
  processes.forEach((process, index) => {
    const label = `Process ${index + 1}`;
    if (!String(process.pid || "").trim()) errors.push(`${label}: enter a process ID.`);
    else if (ids.has(String(process.pid).trim().toUpperCase())) errors.push(`${label}: process IDs must be unique.`);
    ids.add(String(process.pid || "").trim().toUpperCase());
    if (String(process.arrival ?? "").trim() === "") errors.push(`${label}: enter an arrival time.`);
    if (!Number.isInteger(Number(process.arrival)) || Number(process.arrival) < 0) errors.push(`${label}: arrival time must be a whole number of 0 or greater.`);
    if (String(process.burst ?? "").trim() === "") errors.push(`${label}: enter a burst time.`);
    if (!Number.isInteger(Number(process.burst)) || Number(process.burst) <= 0) errors.push(`${label}: burst time must be a whole number greater than 0.`);
    if (requirePriority && String(process.priority ?? "").trim() === "") errors.push(`${label}: enter a priority.`);
    if (requirePriority && !Number.isInteger(Number(process.priority))) errors.push(`${label}: priority must be a whole number.`);
  });
  return errors;
}

export function simulate(processes, algorithm, quantum = 2) {
  const rows = makeProcessRows(processes);
  const segments = [];
  const trace = [];
  let time = 0;
  const record = (description, running = "—", ready = []) => {
    trace.push({
      time,
      running,
      ready: ready.map((process) => process.pid),
      remaining: rows.filter((process) => process.remaining > 0).map((process) => `${process.pid}: ${process.remaining}`),
      completed: rows.filter((process) => process.completion !== null).map((process) => process.pid),
      explanation: description,
    });
  };

  if (algorithm === "FCFS") {
    for (const process of rows) {
      if (time < process.arrival) {
        appendIdle(segments, time, process.arrival);
        time = process.arrival;
        record(`CPU was idle until ${process.pid} arrived.`);
      }
      process.firstStart = time;
      const start = time;
      time += process.burst;
      process.remaining = 0;
      process.completion = time;
      addSegment(segments, process, start, time);
      record(`${process.pid} was selected by arrival order (FCFS).`);
    }
  } else if (algorithm === "SJF" || algorithm === "Priority") {
    let completed = 0;
    while (completed < rows.length) {
      const ready = rows.filter((process) => process.completion === null && process.arrival <= time);
      if (!ready.length) {
        const nextArrival = Math.min(...rows.filter((process) => process.completion === null).map((process) => process.arrival));
        appendIdle(segments, time, nextArrival);
        time = nextArrival;
        record(`CPU was idle until the next process arrived at time ${time}.`);
        continue;
      }
      const selected = [...ready].sort(
        algorithm === "SJF"
          ? (a, b) => a.burst - b.burst || a.index - b.index
          : (a, b) => a.priority - b.priority || a.index - b.index,
      )[0];
      selected.firstStart = time;
      const start = time;
      time += selected.burst;
      selected.remaining = 0;
      selected.completion = time;
      addSegment(segments, selected, start, time);
      const reason = algorithm === "SJF"
        ? `${selected.pid} was selected because it has the shortest burst time among arrived processes.`
        : `${selected.pid} was selected because it has the highest priority among arrived processes (smaller number = higher priority).`;
      record(reason, selected.pid, ready.filter((process) => process !== selected));
      completed += 1;
    }
  } else if (algorithm === "Round Robin") {
    let completed = 0;
    while (completed < rows.length) {
      let executed = false;
      for (const process of rows) {
        if (process.remaining <= 0 || process.arrival > time) continue;
        executed = true;
        const start = time;
        if (process.firstStart === null) process.firstStart = time;
        const slice = Math.min(Number(quantum), process.remaining);
        time += slice;
        process.remaining -= slice;
        addSegment(segments, process, start, time);
        if (process.remaining === 0) {
          process.completion = time;
          completed += 1;
          record(`${process.pid} used its turn in the input-order pass and finished its CPU burst.`, process.pid, rows.filter((item) => item.remaining > 0 && item.arrival <= time));
        } else {
          record(`${process.pid} used its time quantum and still has ${process.remaining} unit(s) left. It will be checked again in the next input-order pass.`, process.pid, rows.filter((item) => item.remaining > 0 && item.arrival <= time));
        }
      }
      if (!executed) {
        const nextArrival = Math.min(...rows.filter((process) => process.remaining > 0).map((process) => process.arrival));
        appendIdle(segments, time, nextArrival);
        time = nextArrival;
        record(`CPU was idle until the next process arrived at time ${time}.`);
        continue;
      }
    }
  } else {
    throw new Error(`Unknown scheduling algorithm: ${algorithm}`);
  }
  return finishResult(rows, segments, trace, algorithm);
}

export const SAMPLE_PROCESSES = [
  { pid: "P1", arrival: 0, burst: 7, priority: 3 },
  { pid: "P2", arrival: 2, burst: 4, priority: 1 },
  { pid: "P3", arrival: 4, burst: 1, priority: 4 },
  { pid: "P4", arrival: 5, burst: 4, priority: 2 },
];
