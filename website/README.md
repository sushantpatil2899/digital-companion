# Filo website

A one-page landing site whose job is to get Mac users to download **Filo.dmg**. Plain HTML, CSS
and JavaScript: no build step, no framework. Open `index.html`, or serve the folder.

## What's here

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `main.js` | The page. `window.FILO_DOWNLOAD` in `index.html` sets the download address, file name, version and size (shown next to the button). |
| `assets/chars/` | The six companions, drawn by the app's own renderer (`src/renderer`), as transparent WebP. |
| `assets/ui/` | Real Filo windows (chat, song, brain view, picker) rendered with the app's own HTML. |
| `assets/media/` | A 3.6 s muted loop of all six (from the Filo video) and its poster frame. |
| `live/` | The live companion: the app's real renderer and character drawings (copied from `src/`), driven by `live/renderer/live.js` instead of the main process. |
| `tools/` | Scripts that regenerate `assets/` and `live/` from the app's source. |
| `downloads/` | Where `Filo.dmg` goes on the server (not in the repo). |

## Regenerating from the app

Run from the repo root (`dcapp/`) after the characters or windows change:

```bash
node website/tools/sync-live.js     # copy the renderer + characters into website/live/
node website/tools/make-assets.js   # re-render assets/chars and assets/ui (PNG)
```

`make-assets.js` writes PNGs; convert them as the committed files are (companions to WebP,
windows to JPEG), e.g. with Pillow: `Image.open(p).save(p[:-4] + '.webp', quality=88)`.

## Hosting on Vultr

Two scripts do it from your Mac (they log in as `root` with your SSH key). Run from the repo root:

```bash
website/deploy/deploy.sh <server-ip>                   # sets up nginx and puts the site live
website/deploy/upload-dmg.sh <server-ip> ~/Downloads/Filo.dmg   # the app, straight to the server
```

Re-run `deploy.sh` after changing the site (it never touches the dmg) and `upload-dmg.sh` for each
new build. With a domain pointed at the server, `deploy.sh <server-ip> filo.example.com` also turns
on HTTPS. The nginx setup it writes is:

```nginx
server {
  server_name filo.example.com;
  root /var/www/filo;            # this folder
  index index.html;

  location /downloads/ {
    types { application/x-apple-diskimage dmg; }
    add_header Content-Disposition 'attachment; filename="Filo.dmg"';
  }
  location / {
    try_files $uri $uri/ =404;
  }
}
```

The site lives in `/var/www/filo` and the app at `/var/www/filo/downloads/Filo.dmg`. The dmg is large (the models are inside the app), so a
Vultr Object Storage bucket is a good home for it: upload it there and set `url` in
`window.FILO_DOWNLOAD` to the bucket's public address.

## Notes before launch

- Togepi is a Pokémon and Wolfie is Stony Brook's mascot: publishing them on a public site needs
  permission (see the main README). The other four companions are Filo's own.
- Set `version` and `size` in `window.FILO_DOWNLOAD` to match the dmg you upload.
