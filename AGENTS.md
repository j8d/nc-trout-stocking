# Repository change policy

- Work on a feature branch and open a pull request; never push directly to `main`.
- Do not approve or merge pull requests on Ryan's behalf in this repository. Prepare changes and verification evidence, then hand the PR to Ryan (`j8d`) for the final merge.
- Do not bypass, disable or weaken repository rules to finish a task. The owner-review exception belongs to Ryan, not autonomous merge permission.
- All changes must pass the `verify` check. Keep schedule dates/official geometry unchanged unless the task explicitly requests a data refresh.
- GitHub authenticates the current CLI as `j8d`: the server cannot distinguish a human from an agent using that credential. These operator-side rules are necessary even with server-side owner-only rulesets.
