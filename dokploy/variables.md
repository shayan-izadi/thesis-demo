# Where each variable lives in Dokploy

Rule: a value goes at the highest level where it is the same for everyone.
Never put real secrets in this repository; type them into Dokploy.

| Variable | Project `thesis-demo` | Environment `staging` | Environment `production` | Service `web` (both envs, identical) |
| --- | --- | --- | --- | --- |
| `GREETING` | `Hello from the thesis demo, deployed by Dokploy` | | | `GREETING=${{project.GREETING}}` |
| `APP_ENV` | | `staging` | `production` | `APP_ENV=${{environment.APP_ENV}}` |
| `LOG_LEVEL` | | `debug` | `info` | `LOG_LEVEL=${{environment.LOG_LEVEL}}` |
| `DATABASE_URL` | | staging Postgres internal URL | production Postgres internal URL | `DATABASE_URL=${{environment.DATABASE_URL}}` |
| `APP_VERSION` | | | | baked into the image by CI (commit SHA) |

## Copy-paste blocks

### Project: shared variables

```
GREETING=Hello from the thesis demo, deployed by Dokploy
```

### Environment: staging

```
APP_ENV=staging
LOG_LEVEL=debug
DATABASE_URL=postgresql://<user>:<password>@<staging-db-internal-host>:5432/thesis
```

### Environment: production

```
APP_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://<user>:<password>@<production-db-internal-host>:5432/thesis
```

### Service `web`: same block in both environments

```
APP_ENV=${{environment.APP_ENV}}
DATABASE_URL=${{environment.DATABASE_URL}}
LOG_LEVEL=${{environment.LOG_LEVEL}}
GREETING=${{project.GREETING}}
```

## Optional: secrets from a vault

Dokploy can fetch a value from HashiCorp Vault/OpenBao, Infisical, AWS Secrets
Manager, Doppler or Azure Key Vault at deploy time instead of storing it, e.g.

```
DB_PASSWORD=${{vault.prod-vault.myapp/prod:DB_PASSWORD}}
```

See https://docs.dokploy.com/docs/core/variables
