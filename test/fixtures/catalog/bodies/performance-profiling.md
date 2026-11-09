# Performance profiling

Apply this skill when a program is too slow or uses too much memory, before anyone changes code to make it faster.

## Rules

- Measure before optimising. Intuition about where time goes is wrong more often than right.
- Profile a realistic workload: production-sized data, a release build with optimisations on, the same runtime flags as production.
- Change one thing, measure again, keep the numbers.
- Stop when the target is met. Define it first: "p95 latency of `/search` under 200 ms at 50 requests per second", "batch finishes within 20 minutes", "resident memory under 1 GB".

## Steps

1. Reproduce the slowness with a benchmark or load test you can rerun: `hyperfine` for commands, pytest-benchmark, JMH, BenchmarkDotNet, Go `testing.B`, k6 or Gatling for services.
2. Decide the resource: CPU-bound (cores at 100%), I/O-bound (waiting on disk or network), lock contention, memory or GC pressure. `top`/`htop`, `vmstat`, `iostat` and the runtime's metrics tell you which.
3. Profile with a sampling profiler and look at a flame graph. The widest plateaus are the hot path.
4. Form a hypothesis about the hot path, change it, rerun the benchmark, compare.
5. Add the benchmark to CI or keep it in the repository so regressions show up.

## Profilers

| Runtime | CPU | Memory |
|---|---|---|
| Linux native | `perf record -g`, then `perf script` into FlameGraph | Valgrind Massif, heaptrack |
| Python | py-spy (`py-spy record -o out.svg --pid`), cProfile + snakeviz, Scalene | tracemalloc, memray |
| Node.js | `node --cpu-prof`, Chrome DevTools, 0x, clinic flame | heap snapshots, clinic heapprofiler |
| JVM | async-profiler, JDK Flight Recorder with Mission Control | heap dump in Eclipse MAT |
| Go | `pprof` (`go tool pprof -http=:8080 cpu.out`) | `pprof` heap and allocs |
| .NET | dotnet-trace, PerfView | dotnet-gcdump, dotMemory |
| Browser | Performance panel, Lighthouse | Memory panel heap snapshots |

## Typical findings

- An O(n^2) loop hidden in a "contains" check on a list; use a set or a dict.
- N+1 queries: one database call per item in a loop. Batch them.
- Serialisation and logging in the hot path (JSON encoding, string formatting of debug logs that are discarded).
- Allocations in tight loops causing GC pauses; reuse buffers, preallocate.
- Synchronous I/O blocking an event loop.
- Memory leaks from caches without bounds, listeners never removed, or closures holding large objects.

## Reporting

State the before and after numbers, the workload, the machine, and the number of runs with variance (median and p95, not one run). A 3% change within noise is not a result.

## Pitfalls

- Micro-benchmarks that the compiler optimises away.
- Profiling a debug build or with a debugger attached.
- Optimising a function that accounts for 2% of the time.

Slow database queries go to sql-query-tuning. Code restructuring after the hot path is found follows refactoring, and wrong results rather than slow ones go to debugging.
