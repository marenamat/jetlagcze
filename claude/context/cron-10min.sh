#!/bin/bash
# Every-10-minutes Claude maintenance: check for new work
set -e
cd /home/maria/claude/jetlagcze
/home/maria/.local/bin/claude --print "10-minute check: Fetch from github (git fetch github), check if github/main has new commits not in local main. If yes, fast-forward main, rebase any mq-claude-* branches onto the new main, and start any newly appeared task files in claude/tasks/t-*.md that have no corresponding branch yet." >> /home/maria/claude/jetlagcze/claude/context/cron-10min.log 2>&1
