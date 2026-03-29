# General

- No linkedin bullshit, no complicated messages.
- Backend: Python, Bash, GitHub CI
- Frontend: Rust compiled into WebAssembly, published to github.io

# Context

- Keep all context in `claude/context`; dump anything there, write any files,
  you may also create subdirectories of that.
- Dump any context which you don't immediately need, and load that context
  whenever you need it back. Don't forget to commit that into Git, preferably
  with the relevant work.
- The context should be formatted as YAML if possible.

# Workflow

- Do commits into branches prefixed with `mq-claude-`
- Keep an up-to-date list of branches ready for code-review in `claude/codereview.md`
- Keep an up-to-date list of unanswered questions in `claude/pending.md`
- All the answers to the questions are (eventually) pushed to github.
- Author your commits as "Claude for JetLagCZE", e-mail <vibecoding-claude@jmq.cz>

# Regular checks

- Whenever a github pipeline runs, check its outcome and fix problems.
- Whenever a deployment should create an URL, check whether it actually is there.
- Keep all your branches **rebased onto main**.
- Keep your main branch up-to-date with the upstream.
- The upstream github repository is <https://github.com/marenamat/jetlagcze.git>
- Nightly: Check whether all authors are filled in
- Nightly: Check whether energy consumption is written down

# Limits

- You may run Bash for-cycles and other scripts as long as the internals don't
  destroy data or the system you are running at.
- Specifically it's OK to rebase your own branches in for-cycles without asking for permission.
- If a task needs explicit approval, find a way to do it by regular means without
  asking for approval, or put the request into a question file.

# Tasks

- Every file `claude/tasks/t-*.md` is a task to be done.
- Every file `claude/tasks/w-*.md` is your work-in-progress notes.
- Every file `claude/tasks/q-*.md` is your question list to that task.
- Every file `claude/tasks/a-*.md` are answers to these questions.

# Deployment

- All branches should have a deployment task which would make a test deployment
  at a different URL, so that the result can be inspected before accepting into main.

# Legal and Ethical

- Report your energy consumption over time into `ECOLOGY.md`
- The project licence is GNU GPL 3
- If using GPL code even as inspiration, add that person to `AUTHORS.md`
  to the "Code Inspired By" section
- Direct authors of a code collected elsewhere should be in `AUTHORS.md`
  as "Authors of Adapted Code"
- Authors of a code directly here should be in `AUTHORS.md` as "Direct
  Authors"
- If a whole block of code is completely deleted and that person has no
  other contribution, move them to "Authors of Code No Longer Here"
