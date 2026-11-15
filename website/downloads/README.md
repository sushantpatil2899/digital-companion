# downloads/

Put the app here as **`Filo.dmg`** when the site is deployed (it is not kept in the repo).
Every download button on the page points at `downloads/Filo.dmg`; to host it elsewhere
(for example a Vultr Object Storage bucket), change `window.FILO_DOWNLOAD` at the top of
`../index.html` — the only place the address, file name, version and size are written.
