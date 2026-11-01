# A seven-minute walkthrough

## 1. The problem — 30 seconds

“A tester gets a new build but cannot tell what changed intentionally. We want
each build and release to explain what changed, what to expect and what to test.”

## 2. One visual PR — 90 seconds

Open the PR that changes **Valve 3** to **PBS valve**. Show the small code change,
then its readable YAML note and real before/after screenshots. Explain that the
agent drafts and updates these; the developer reviews them with the code.

## 3. A nonvisual PR — 60 seconds

Open the PR adding UTC timestamps to downloaded pump logs. Its note includes a
before/after log example and a concrete check. No screenshot is required because
the screen is unchanged. This process covers more than GUI changes.

## 4. A build before release — 90 seconds

Open a successful PR workflow. Show its **Build with tester handoff** summary and
downloadable artifact. The package contains the runnable app, a readable handoff,
images and exact build/baseline identities. Show the earlier-build baseline input.
Build handoffs are previews; they do not claim the build has passed testing.

## 5. Missing note — 60 seconds

Open the intentionally incomplete PR. Show **Required tester change note** failing
and the tester build being withheld. Where branch protection is available, show
the disabled merge button. Do not claim it is enforced if the account lacks Pro.
The successful PRs show what passing looks like after the note is added.

## 6. The tester's release page — 90 seconds

Open **Station Desk v0.2.0 · Tester handoff**. Both reviewed changes appear in one
document with screenshots and suggested checks. The archive contains the same app
version and handoff. Show **Prepare tester release → Run workflow** to demonstrate
the input form; an existing demo release can be refreshed with the same exact
target and baseline. A new version is first created as a draft for lead review.

## What is real / what is a demonstration

- Real: new GitHub PRs, checks, executable sample app, browser screenshots,
  Changie formatting, build downloads and release publication.
- Demonstration: fictional controls and illustrative change descriptions.
- Human responsibility: verifying intent, completeness and testing guidance;
  deciding whether a build/release has passed testing.
- Independent of Nathan's proposed workflow. No original company repo is modified.
