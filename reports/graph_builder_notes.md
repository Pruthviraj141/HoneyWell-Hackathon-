# Graph Builder Notes

## Windows Built
Total weekly snapshots built: 5

## Window Details

### Snapshot 1 (2026-06-25 to 2026-07-02)
- Entity nodes: 100
- Resource nodes: 18
- Total nodes in x: 118
- Edges: 406 (represented as 812 directed edges)
- Edges with shared_infra_flag=1: 34

### Snapshot 2 (2026-07-02 to 2026-07-09)
- Entity nodes: 100
- Resource nodes: 18
- Total nodes in x: 118
- Edges: 418 (represented as 836 directed edges)
- Edges with shared_infra_flag=1: 39

### Snapshot 3 (2026-07-09 to 2026-07-16)
- Entity nodes: 100
- Resource nodes: 18
- Total nodes in x: 118
- Edges: 428 (represented as 856 directed edges)
- Edges with shared_infra_flag=1: 34

### Snapshot 4 (2026-07-16 to 2026-07-23)
- Entity nodes: 100
- Resource nodes: 18
- Total nodes in x: 118
- Edges: 405 (represented as 810 directed edges)
- Edges with shared_infra_flag=1: 37

### Snapshot 5 (2026-07-23 to 2026-07-30)
- Entity nodes: 100
- Resource nodes: 18
- Total nodes in x: 118
- Edges: 333 (represented as 666 directed edges)
- Edges with shared_infra_flag=1: 27

## Verification
- Shared infrastructure signal validation: Found 171 total edges across all windows that hit the shared infrastructure flag (IP or MAC reuse across entities). This confirms the relational signal from Step 1 correctly translated to the graph.
- Node indexing: Safe (entity and resource nodes share the `x` matrix perfectly, with shape boundaries maintained).
