#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
find "$ROOT" -maxdepth 3 -type d | sort
