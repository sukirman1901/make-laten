#!/bin/bash
# make-laten shell integration
# Add to ~/.bashrc or ~/.zshrc:
#   source $(npm root -g)/make-laten/shell/init.sh

 MAKE_LATEN_BIN="make-laten"

_make_laten_original_read() { command cat "$@" 2>/dev/null || command /bin/cat "$@"; }
_make_laten_original_grep() { command grep "$@"; }
_make_laten_original_git() { command git "$@"; }

ml_read() {
  if [ -z "$MAKE_LATEN_QUIET" ]; then
    $_MAKE_LATEN_BIN read "$@" 2>/dev/null || _make_laten_original_read "$@"
  else
    $_MAKE_LATEN_BIN read "$@"
  fi
}

ml_grep() {
  $_MAKE_LATEN_BIN grep "$@"
}

ml_git() {
  if [ "$1" = "diff" ]; then
    shift
    $_MAKE_LATEN_BIN git diff "$@"
  elif [ "$1" = "status" ]; then
    $_MAKE_LATEN_BIN git status
  else
    _make_laten_original_git "$@"
  fi
}

ml_search() {
  $_MAKE_LATEN_BIN search "$@"
}

ml_fetch() {
  $_MAKE_LATEN_BIN fetch "$@"
}

alias mread='ml_read'
alias mgrep='ml_grep'
alias mdiff='ml_git diff'
alias mstatus='ml_git status'
alias msearch='ml_search'
alias mfetch='ml_fetch'

make-laten-status() {
  echo "make-laten shell integration active"
  echo "  mread <file>      → compressed file read"
  echo "  mgrep <pattern>   → grouped grep"
  echo "  mdiff             → compressed git diff"
  echo "  mstatus           → git status summary"
  echo "  msearch <query>   → web search"
  echo "  mfetch <url>      → web fetch + compress"
  echo ""
  $_MAKE_LATEN_BIN cache stats 2>/dev/null
}

echo "✓ make-laten shell loaded (aliases: mread, mgrep, mdiff, mstatus, msearch, mfetch)"
