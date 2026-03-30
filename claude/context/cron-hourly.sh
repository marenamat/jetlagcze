#!/bin/bash
# Hourly Claude maintenance tasks for jetlagcze
set -e
cd /home/maria/claude/jetlagcze
/home/maria/.local/bin/claude --print "Hourly maintenance: (1) Check whether the dumped context in claude/context/ is up-to-date with current work and update if needed. (2) Prune merged branches: check which mq-claude-* branches have been merged into main upstream (https://github.com/marenamat/jetlagcze.git) and delete them locally. Keep codereview.md updated accordingly." >> /home/maria/claude/jetlagcze/claude/context/cron-hourly.log 2>&1
