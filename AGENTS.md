# Tester change notes are part of every PR

This is a fictional demo. Never connect it to hardware or company services.

## Track the complete change

Maintain one new `.changes/unreleased/<descriptive-id>.yaml` file per PR. Update
it as the PR changes, rather than describing only the final commit. Cover all
testing-relevant changes in that PR: appearance, behavior, limits, interlocks,
logging, downloaded data and error handling. Follow `docs/change-note-template.yaml`.

Write for a tester who does not read code. Explain what changed, why, previous
and expected behavior, affected conditions, and concrete checks. Avoid internal
function names, file lists and commit summaries. Do not invent intent or claim
physical behavior was tested; explicitly identify assumptions needing review.
The developer must review accuracy and completeness before merging. Agent rules
guide drafting; CI checks structure, not semantic completeness or plain language.

## Visual changes

For changes to `app/index.html`, `app/styles.css`, `app/ui.js` or `app/config.js`,
include actual browser screenshots of the same view before and after the change.
Also do this for any other change that affects appearance. Never draw, synthesize
or edit a screenshot to stand in for the app. Use the same viewport, initial state
and data. Capture every affected view; the demo has one view.

1. Commit the app change first.
2. Run `npm run screenshots -- --base <PR-merge-base> --head HEAD --change <id>`.
3. Add the PNGs and capture.json under `docs/change-images/<id>/`.
4. Reference them in the new note, and commit the note and images.
5. Recapture after any app source change. If capture fails, fix it before merging;
   never label a GUI change as nonvisual just to pass the check.

For a nonvisual change, set Visual to "no" and explain why screenshots would not
demonstrate it. Include an observable test, such as inspecting a downloaded log.

## Review and release

Set PullRequest to this demo PR's URL. Do not change another merged PR's note;
add a new correction note instead. Run tests and validate against the PR base.
CI uses the base branch's validator so a PR cannot relax its own note rules.

The release workflow selects newly added notes between two exact commits/tags,
then uses pinned Changie to format them. Notes stay in Git as a permanent record;
`.changes/unreleased` means source fragments, not 'include all of main'. A lead
reviews the generated draft, especially reversions and superseded behavior.

Successful PR and main builds also carry a tester handoff. They are explicitly
labelled test builds and include the exact source commit, baseline and run link.
Use the latest published release by default or an earlier tested build's commit
when requested. For an incremental build, update this PR's note when app behavior
changes so the handoff can describe that range. Build notes are not a release or
a record of completed testing.
