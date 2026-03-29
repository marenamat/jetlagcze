# Pending questions

## Manual setup required: GitHub Pages

The deployment workflows write to the `gh-pages` branch via
`peaceiris/actions-gh-pages`, but GitHub Pages is not yet enabled on the repo.

**Action needed:** Go to
https://github.com/marenamat/jetlagcze/settings/pages
and set Source → Deploy from a branch → `gh-pages` / `/ (root)`.

Once done, the production site will be at:
https://marenamat.github.io/jetlagcze/

And branch previews at:
https://marenamat.github.io/jetlagcze/preview/<branch-name>/
