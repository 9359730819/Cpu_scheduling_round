import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_PROCESSES, simulate, validateProcesses } from "./scheduler.js";

test("FCFS follows input order and represents idle time before a process starts", () => {
  const result = simulate([
    { pid: "P1", arrival: 3, burst: 2 },
    { pid: "P2", arrival: 0, burst: 1 },
  ], "FCFS");

  assert.deepEqual(result.segments.map(({ pid, start, end }) => [pid, start, end]), [
    ["IDLE", 0, 3],
    ["P1", 3, 5],
    ["P2", 5, 6],
  ]);
  assert.deepEqual(result.rows.map(({ completion, response }) => [completion, response]), [[5, 0], [6, 5]]);
  assert.equal(result.metrics.observationTime, 6);
  assert.equal(result.metrics.utilization, 50);
  assert.equal(result.trace.length, result.segments.length);
});

test("non-preemptive SJF chooses the shortest ready process and breaks ties by input order", () => {
  const result = simulate([
    { pid: "P1", arrival: 0, burst: 5 },
    { pid: "P2", arrival: 2, burst: 2 },
    { pid: "P3", arrival: 1, burst: 2 },
  ], "SJF");

  assert.deepEqual(result.segments.map(({ pid }) => pid), ["P1", "P2", "P3"]);
  assert.deepEqual(result.rows.map(({ completion, waiting }) => [completion, waiting]), [[5, 0], [7, 3], [9, 6]]);
});

test("priority scheduling favors smaller priority numbers and breaks ties by input order", () => {
  const result = simulate([
    { pid: "P1", arrival: 0, burst: 5, priority: 9 },
    { pid: "P2", arrival: 2, burst: 2, priority: 1 },
    { pid: "P3", arrival: 1, burst: 3, priority: 1 },
  ], "Priority");

  assert.deepEqual(result.segments.map(({ pid }) => pid), ["P1", "P2", "P3"]);
  assert.equal(result.rows[0].completion, 5);
});

test("Round Robin uses one input-order scan per pass and accepts arrivals during a pass", () => {
  const result = simulate([
    { pid: "P1", arrival: 0, burst: 2 },
    { pid: "P2", arrival: 0, burst: 2 },
    { pid: "P3", arrival: 1, burst: 1 },
  ], "Round Robin", 1);

  assert.deepEqual(result.segments.map(({ pid, start, end }) => [pid, start, end]), [
    ["P1", 0, 1],
    ["P2", 1, 2],
    ["P3", 2, 3],
    ["P1", 3, 4],
    ["P2", 4, 5],
  ]);
  assert.deepEqual(result.trace[0].ready, ["P1", "P2", "P3"]);
  assert.deepEqual(result.rows.map(({ completion, turnaround, waiting, response }) => [completion, turnaround, waiting, response]), [
    [4, 4, 2, 0],
    [5, 5, 3, 1],
    [3, 2, 1, 1],
  ]);
});

test("sample workload results are finite and validation rejects empty numeric fields and duplicate IDs", () => {
  const results = ["FCFS", "SJF", "Round Robin", "Priority"].map((algorithm) =>
    simulate(SAMPLE_PROCESSES, algorithm, 2),
  );
  assert.equal(results.length, 4);
  assert.ok(results.every((result) => result.rows.length === SAMPLE_PROCESSES.length));
  assert.ok(validateProcesses([
    { pid: "P1", arrival: "", burst: 1, priority: "" },
    { pid: "p1", arrival: 0, burst: 0, priority: 0 },
  ], { requirePriority: true }).length > 0);
});
