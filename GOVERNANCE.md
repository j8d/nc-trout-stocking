# Repository governance

`main` is protected by two active GitHub repository rulesets. Definitions are source-controlled in `.github/rulesets.json`. These are a record of owner-approved policy, not permission for agents to reconfigure protections.

## Mandatory gate, without bypass

[PR and passing CI ruleset](https://github.com/j8d/nc-trout-stocking/rules/25750295):
- All changes to `main` require a pull request.
- `verify` must pass, from the GitHub Actions integration (ID 15368), against the latest base.
- Review threads must be resolved.
- No force pushes or branch deletion.
- **No bypass actors**, including the repository owner.

## Owner-only updates and review

[Owner ruleset](https://github.com/j8d/nc-trout-stocking/rules/25750296):
- Updates/merges to `main` are restricted.
- Only **`j8d` (user ID 4845675)** can bypass that restriction, and only through a pull request—not a direct push.
- One approving code-owner review is required normally; stale approvals are dismissed.
- `.github/CODEOWNERS` assigns every file, including itself, to `@j8d`. This takes effect once the file is merged into the base branch.
- `j8d` can bypass this owner-review requirement at PR merge time. Ryan explicitly chose this exception because GitHub prohibits approving one's own PRs. The separate mandatory gate still enforces a PR, passing CI and resolved threads.

GitHub public repositories allow outside users to submit reviews; this configuration cannot prevent someone from clicking **Approve** on a public PR. Their approval cannot substitute for the required `j8d` code-owner review or give them merge permission. `j8d` is currently the only collaborator, with no pending collaborator invitations and no deploy keys. There is no GitHub Actions bypass actor.

## Human versus automation

The authenticated CLI uses `j8d`, so GitHub sees an agent using that credential as the owner too. Server-side rules cannot identify whether Ryan or an agent is behind the same account. `AGENTS.md` therefore prohibits agents from approving or merging. They prepare a PR and hand it to Ryan for the final decision.

This also means settings are not immutable: the repository owner can deliberately change/delete rulesets. No extra account, paid plan, or second identity was created.

## Verification

Read active rules and exact bypass lists:

```sh
gh api repos/j8d/nc-trout-stocking/rulesets
gh api repos/j8d/nc-trout-stocking/rulesets/25750295
gh api repos/j8d/nc-trout-stocking/rulesets/25750296
gh api repos/j8d/nc-trout-stocking/rules/branches/main
gh api repos/j8d/nc-trout-stocking/collaborators
gh api repos/j8d/nc-trout-stocking/codeowners/errors
```

Do not test by making an unauthorized merge, granting another user write access, or disabling a rule. Configuration read-back and GitHub's PR merge-state evaluation establish current enforcement without those side effects.

Official documentation:
- [Available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Repository rulesets REST API](https://docs.github.com/en/rest/repos/rules)
- [CODEOWNERS and required review](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
