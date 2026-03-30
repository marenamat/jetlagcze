#!/bin/bash
# Nightly Claude maintenance tasks for jetlagcze
set -e
cd /home/maria/claude/jetlagcze
/home/maria/.local/bin/claude --print "Nightly maintenance: (1) Check AUTHORS.md — verify all contributors in git log are properly listed. Add any missing authors to the correct section. (2) Check ECOLOGY.md — verify energy consumption has been recorded for recent work sessions. Add any missing entries." >> /home/maria/claude/jetlagcze/claude/context/cron-nightly.log 2>&1
