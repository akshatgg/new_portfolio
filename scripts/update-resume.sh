#!/usr/bin/env bash
# Sync the latest resume & CV into the portfolio and push (Vercel auto-deploys on push).
#
# Usage:
#   ./scripts/update-resume.sh                       # auto-detect newest Akshat*.pdf in ~/Downloads
#   ./scripts/update-resume.sh <resume.pdf> <cv.pdf> # explicit paths
#
# Auto-detect rules:
#   - scans ~/Downloads/Akshat*.pdf newest-first, skipping duplicate files (same md5)
#   - the 1-page PDF is the resume, the multi-page PDF is the CV
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATIC_DIR="$REPO_DIR/static"
DOWNLOADS="$HOME/Downloads"

pages() { mdls -name kMDItemNumberOfPages -raw "$1" 2>/dev/null || echo 0; }

RESUME=""
CV=""

if [[ $# -eq 2 ]]; then
	RESUME="$1"
	CV="$2"
elif [[ $# -eq 0 ]]; then
	candidates=()
	hashes=()
	while IFS= read -r f; do
		h=$(md5 -q "$f")
		dup=0
		for seen in ${hashes[@]+"${hashes[@]}"}; do
			[[ "$seen" == "$h" ]] && dup=1 && break
		done
		[[ $dup -eq 1 ]] && continue
		hashes+=("$h")
		candidates+=("$f")
		[[ ${#candidates[@]} -ge 2 ]] && break
	done < <(ls -t "$DOWNLOADS"/Akshat*.pdf 2>/dev/null)

	if [[ ${#candidates[@]} -lt 2 ]]; then
		echo "error: need two distinct Akshat*.pdf files in $DOWNLOADS" >&2
		exit 1
	fi

	for f in "${candidates[@]}"; do
		if [[ "$(pages "$f")" -le 1 ]]; then RESUME="$f"; else CV="$f"; fi
	done

	if [[ -z "$RESUME" || -z "$CV" ]]; then
		echo "error: could not tell resume (1 page) from CV (2+ pages) among:" >&2
		printf '  %s (%s pages)\n' "${candidates[0]}" "$(pages "${candidates[0]}")" >&2
		printf '  %s (%s pages)\n' "${candidates[1]}" "$(pages "${candidates[1]}")" >&2
		echo "pass paths explicitly: ./scripts/update-resume.sh <resume.pdf> <cv.pdf>" >&2
		exit 1
	fi
else
	echo "usage: $0 [<resume.pdf> <cv.pdf>]" >&2
	exit 1
fi

echo "resume: $RESUME ($(pages "$RESUME") page)"
echo "cv:     $CV ($(pages "$CV") pages)"

cp "$RESUME" "$STATIC_DIR/Akshat.pdf"
cp "$CV" "$STATIC_DIR/Akshat_CV.pdf"

cd "$REPO_DIR"
if git diff --quiet -- static/Akshat.pdf static/Akshat_CV.pdf && \
	[[ -z "$(git status --porcelain static/Akshat.pdf static/Akshat_CV.pdf)" ]]; then
	echo "no changes — static PDFs already up to date"
	exit 0
fi

git add static/Akshat.pdf static/Akshat_CV.pdf
git commit -m "chore: update resume and CV"
git push
echo "pushed — Vercel will redeploy the portfolio automatically"
