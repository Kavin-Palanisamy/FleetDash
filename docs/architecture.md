# Architecture

```
Simulator/Vehicle --HTTP POST--> Express API --> Validate --> Telemetry Processor
                                                                |-> update in-memory latest state
                                                                |-> check speed limit -> Alert
                                                                |-> buffer -> batch insert -> MongoDB
                                                                '-> Socket.IO emit --> React Dashboard
```
Rule: not every event needs an immediate DB write. Latest state lives in memory,
history is written in batches, alerts are written immediately (rare + important).

TODO (Week 1): replace with your own diagram and explanation.
