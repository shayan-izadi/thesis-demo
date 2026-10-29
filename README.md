# thesis-demo: Dokploy staging/production demo kit

A tiny Node.js service plus the CI/CD pipeline and Dokploy configuration
needed to show one dashboard managing staging and production, with no
manual Dockerfile or `.env` edits on any VPS.

```
.
├── app/                         demo service (no dependencies) + tests
├── Dockerfile                   one Dockerfile for every environment
├── docker-compose.local.yml     local run without Dokploy
├── .github/workflows/
│   ├── deploy.yml               test → build once → staging → approval → production
│   └── rollback.yml             point an environment back at an older image
├── scripts/
│   ├── dokploy-deploy.sh        calls Dokploy's application.deploy API
│   └── smoke-test.sh            waits until /health reports the expected version
├── dokploy/variables.md         which variable lives at which Dokploy level
└── DEMO.md                      full setup guide + 7-minute presentation script
```

Start with **DEMO.md**.

## The idea in one paragraph

CI builds the image once and tags it with the commit SHA. Promoting to an
environment means pointing that environment's tag (`:staging`,
`:production`) at the SHA and asking Dokploy to redeploy. Dokploy injects
that environment's variables (database URL, `APP_ENV`, log level) from its
project → environment → service hierarchy. The service definition is the
same in both environments, so the two cannot drift apart.

## Endpoints

| Path | Returns |
| --- | --- |
| `/` | HTML page with a coloured banner per environment, version and DB status |
| `/health` | `{"status":"ok","env":"...","version":"..."}` used by the smoke test |
| `/api/info` | JSON with env, version, greeting, database host (password hidden) and reachability |
