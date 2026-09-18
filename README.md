# educk-communication-portal

> Communication Bounded Context: Parent-Teacher Web UI Portal (`educk-comm-portal`)

Part of the **eduTrack** distributed system — Team G1.  
Governance and documentation live in [`educk-docs`](https://github.com/code-corhuila/educk-docs).

---

## 1. UI & Tech Stack

- **Framework:** React 18 + Vite
- **Design System:** Implements Figma tokens (Deep Navy `#0f172a`, Royal Blue `#3b82f6`, Inter font)
- **Local Port:** `3000`
- **Backend API target:** `http://localhost:8085/api/v1`

## 2. Branching & Governance

Three permanent branches. **None of them accepts a direct commit** — you enter through a child branch and leave through a Pull Request:

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent branch into another (`merge develop -> qa` and `merge qa -> main` are strictly prohibited).

`main` requires **1 approval from `@ariel5253`**. On `develop` and `qa`, the team requires 1 approving peer review.

Full policy: `00-governance/branching-policy.md` in [`educk-docs`](https://github.com/code-corhuila/educk-docs).

## 3. How to Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or run containerized
docker compose up -d --build
```
