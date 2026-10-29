# Dokploy demo: staging and production from one dashboard

Goal of the demo: show that after CI passes, deployments to staging and
production happen without anyone SSHing into a VPS or editing Dockerfiles
or `.env` files by hand. Every environment-specific value lives in Dokploy.

Time to set up: about 1 to 2 hours the first time. Time to present: about 7 minutes.

---

## 0. What you need

| Item | Notes |
| --- | --- |
| 1 or 2 Linux VPSs (Ubuntu 22.04/24.04, 2 GB RAM+) | One VPS is enough. Two shows the multi-server story: Dokploy + staging on VPS A, production on VPS B. |
| A domain (or subdomains) pointing at the VPS | e.g. `dokploy.example.com`, `staging.demo.example.com`, `demo.example.com`. Without a domain you can use the server IP and ports, but HTTPS will not work. |
| A GitHub repository | Push the contents of this folder to it. Images go to GitHub Container Registry (GHCR). |

Ports 80, 443 and 3000 must be free on the Dokploy server.

---

## 1. Install Dokploy (on VPS A)

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Open `http://<VPS-A-IP>:3000`, create the admin account, then in the
web settings give the panel its own domain (e.g. `dokploy.example.com`) so it
gets HTTPS. Pin the version you tested with (note it down in the thesis).

**Optional, multi-server:** in *Remote Servers*, add VPS B with an SSH key and
let Dokploy set it up. Production services will be placed on VPS B.

---

## 2. Create the project and its two environments

1. *Create Project* → name it `thesis-demo`.
2. The project starts with a default environment. Rename/use it as `production`.
3. Add a second environment: `staging`.

Now one project shows both environments side by side. This is criterion 2.

---

## 3. Put the variables in Dokploy (not on the VPS)

Variables live at three levels and are inherited downwards:
project → environment → service. See `dokploy/variables.md` for the exact values.

**Project-level (shared by every environment):**

```
GREETING=Hello from the thesis demo, deployed by Dokploy
```

**Environment `staging`:**

```
APP_ENV=staging
LOG_LEVEL=debug
DATABASE_URL=<internal connection URL of the staging Postgres, step 4>
```

**Environment `production`:**

```
APP_ENV=production
LOG_LEVEL=info
DATABASE_URL=<internal connection URL of the production Postgres, step 4>
```

---

## 4. Add a database to each environment

In **each** environment: *Create Service* → *Database* → PostgreSQL.
Use the same database name in both (e.g. `thesis`) but different passwords.
Copy the **internal** connection URL Dokploy shows and paste it as
`DATABASE_URL` in that environment's variables (step 3).

(On a two-server setup, place the production database on VPS B.)

---

## 5. Add the application to each environment

In **each** environment: *Create Service* → *Application*.

| Setting | staging | production |
| --- | --- | --- |
| Name | `web` | `web` |
| Server | VPS A (or default) | VPS B (or default) |
| Source / provider | Docker image | Docker image |
| Image | `ghcr.io/<owner>/thesis-demo:staging` | `ghcr.io/<owner>/thesis-demo:production` |
| Port | 3000 | 3000 |
| Domain | `staging.demo.example.com` (HTTPS on) | `demo.example.com` (HTTPS on) |

**Service variables: paste the SAME block in both environments.**

```
APP_ENV=${{environment.APP_ENV}}
DATABASE_URL=${{environment.DATABASE_URL}}
LOG_LEVEL=${{environment.LOG_LEVEL}}
GREETING=${{project.GREETING}}
```

This is the key point of the demo: the service definition is identical in
both environments. Only the environment-level values differ, and they are
edited in the dashboard, not on a server.

If the GHCR package is private, add GHCR under *Registry* in Dokploy with a
GitHub username and a personal access token with `read:packages`. For the
demo it is simpler to make the package public after the first CI run.

Finally, copy each application's **applicationId** (visible in the URL of the
service page, or via `GET /api/project.all`). You need both in step 6.

---

## 6. Connect GitHub Actions

1. In Dokploy: *Profile* → generate an **API key**.
2. In GitHub: *Settings → Secrets and variables → Actions*:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DOKPLOY_TOKEN` | the API key |
| Variable | `DOKPLOY_URL` | `https://dokploy.example.com` |
| Variable | `DOKPLOY_STAGING_APP_ID` | applicationId of staging `web` |
| Variable | `DOKPLOY_PRODUCTION_APP_ID` | applicationId of production `web` |
| Variable | `STAGING_URL` | `https://staging.demo.example.com` |
| Variable | `PRODUCTION_URL` | `https://demo.example.com` |

3. *Settings → Environments*: create `staging` and `production`.
   On `production`, add yourself (or the TA) as a **required reviewer**.
   That is the manual approval gate before production.

4. Push to `main`. The first run builds the image, deploys staging,
   and waits for approval before production.

---

## 7. The 7-minute demo script

| Min | Show | Say |
| --- | --- | --- |
| 0:00 | The problem slide | "Today, after CI, we SSH into each VPS and edit Dockerfiles and `.env` files by hand." |
| 0:45 | Dokploy dashboard, project `thesis-demo` | "One project, two environments, both visible here. Staging on one server, production on another." |
| 1:30 | Variables: project → staging → production → service | "Shared values at project level, differences at environment level. The service block is identical in both environments." |
| 2:30 | Make a visible code change (e.g. edit the page text in `app/server.js`), commit, push | "This is the only thing a developer does." |
| 3:00 | GitHub Actions run: test → build → deploy-staging | "CI builds one image, tags it with the commit SHA, promotes it to staging and calls Dokploy's API." |
| 4:00 | Open the staging URL: orange banner, new version | "Staging runs the new version against the staging database." |
| 4:30 | Approve the production job in GitHub | "Production needs an explicit approval." |
| 5:15 | Open the production URL: green banner, same version | "Same image digest, different variables, different database. No file was edited on any server." |
| 5:45 | Change `GREETING` at project level in Dokploy, redeploy both | "A config change is a dashboard edit plus redeploy, with history, not an SSH session." |
| 6:30 | Run the *Rollback* workflow (or Dokploy's own rollback) | "Rolling back is pointing the tag at an older SHA." |

Backup plan if the network fails during the presentation: record the run once
beforehand (screen capture) and keep the GitHub Actions log and Dokploy
deployment history open in tabs.

---

## 8. What to say about the limits

- Dokploy is still pre-1.0 (v0.30.x as of October 2026). Pin the version and back up its own Postgres.
- Multi-node scaling uses Docker Swarm, which Docker maintains but no longer actively develops.
- SSO, audit logs and custom roles are in the paid enterprise tier; nothing in this demo needs them.

---

## 9. Run it locally (no Dokploy) to check the image

```bash
cd app && npm test && cd ..
docker compose -f docker-compose.local.yml up --build
# open http://localhost:3000  (grey "LOCAL" banner)
```
