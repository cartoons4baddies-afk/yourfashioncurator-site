# YOURFASHIONCURATOR — website + private editor

This is a new, clean, deployable version of the V30 visual direction. No sample posts or fabricated editorial articles remain.

## What's ready
- Public homepage with fixed collage backgrounds for all agreed sections.
- Each new **published** article appears automatically on the homepage and in its chosen section.
- Private `admin.html` sign-in for authorized editor(s).
- Write posts, choose a category, add a cover, create and reorder text, heading, quote, photo, sticker/cutout, and divider blocks.
- Drafts, published status, pinned articles, edit/delete, live preview.
- Editable homepage introduction, About Me, Instagram, TikTok, and contact email.
- Secure database access through Supabase RLS; image uploads into Supabase Storage.

## First-time setup (one-off)
1. Create a free/paid Supabase project at <https://supabase.com/dashboard>.
2. Open Supabase **SQL Editor**, paste `supabase/schema.sql`, and run it *once* in a new project. Do not re-run against an existing schema without reviewing duplicate policies.
3. In Supabase **Authentication → Users**, create your own login user (email and strong password). Keep that password private.
4. Copy the user's UUID from Authentication → Users. In SQL Editor run:
   ```sql
   insert into public.editors (user_id) values ('YOUR-USER-UUID');
   ```
5. In Supabase **Project Settings → API**, copy **Project URL** and your **publishable/anon key** into `config.js`. The public key is intended for the client, with SQL RLS protecting the data. **Never paste a `service_role` or secret key there.**
6. Open `admin.html` on a local HTTP server (`python3 -m http.server 8000` from this directory) or after publishing. Sign in and start adding content. For local use, visit `http://localhost:8000/admin.html`.
7. Configure Supabase Authentication **Site URL** to the eventual website URL. Disable public self-sign-up if you don't want visitors to register. Only the user UUID added to `editors` can manage content.

## Publish with GitHub Pages
1. Create a **new GitHub repository** (e.g. `yourfashioncurator-site`) and upload the *contents* of this directory, including `index.html`, `admin.html`, `config.js`, and `assets/` (not the enclosing folder).
2. In repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then Save.
3. Your public site becomes `https://YOUR-GITHUB-USERNAME.github.io/yourfashioncurator-site/`, and private editor is at `/admin.html` on the same site.
4. Enter the full published URL in Supabase Authentication's **Site URL** field.

GitHub Pages hosts the files. Supabase stores users, articles, and uploaded pictures. Published updates from the admin are automatic and do **not** require committing or updating GitHub.

## Important limitations and next development
- This is a first usable editor, not a full drag-and-drop Canva clone. It uses **reorderable blocks** and customizable layout/size/alignment, including image-cutout blocks. Advanced sticker positioning, freely overlaid layers, and in-article collages are future iterations.
- Article images must be yours or images you have permission to publish. Moodboard backgrounds may require rights clearance for a public commercial site; replace them before monetization if necessary.
- Because public media is used, any uploaded picture has a public URL; don't upload private files.
- Before launch, test the actual login, RLS permissions, publication, and image upload against your own Supabase project. Live services cannot be verified until connected.
- Content is loaded in the browser from Supabase; public articles use query-string URLs (`?post=slug&section=...`). More advanced SEO with server rendering can be added later.
- This project does not integrate an affiliate tracking or payment system yet. Shop is a normal editorial section for now.
