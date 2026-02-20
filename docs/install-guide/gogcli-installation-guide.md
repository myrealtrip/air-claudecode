# gogcli Installation Guide

gogcli is a unified CLI for Google Workspace services -- Gmail, Calendar, Drive, Docs, Sheets, Slides, Contacts, Tasks, and more -- with JSON output for scripting.

- Official site: https://gogcli.sh/
- GitHub repository: https://github.com/steipete/gogcli

---

## Installation

### macOS

```bash
brew install steipete/tap/gogcli
```

Upgrade:

```bash
brew upgrade steipete/tap/gogcli
```

---

## Verify Installation

```bash
gog --help
```

---

## Google Cloud Project Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Enter a project name (e.g., `gogcli`) and create

### 2. Enable APIs

1. Navigate to **APIs & Services > Library**
2. Search and enable the APIs you need:

   | API | Required for |
   |---|---|
   | Google Calendar API | `gog calendar` |
   | Gmail API | `gog gmail` |
   | Google Drive API | `gog drive`, `gog docs`, `gog sheets`, `gog slides` |
   | Google People API | `gog contacts`, `gog people` |
   | Tasks API | `gog tasks` |

### 3. Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Select **External** user type (or **Internal** for Workspace orgs)
3. Fill in required fields:
   - App name (e.g., `gogcli`)
   - User support email
   - Developer contact email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes** and add the scopes for your enabled APIs
6. Click **Save and Continue**
7. On the **Test users** page, add your Google account email(s)
8. Click **Save and Continue** > **Back to Dashboard**

> **Note:** While in "Testing" status, only added test users can authorize. To remove this restriction, publish the app.

### 4. Create OAuth Client ID

1. Navigate to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS > OAuth client ID**
3. Application type: **Desktop app**
4. Enter a name (e.g., `gogcli-desktop`)
5. Click **Create**
6. Click **Download JSON** and save the file

---

## Authentication Setup

### 1. Register OAuth Credentials

```bash
gog auth credentials ~/Downloads/client_secret_....json
```

### 2. Authorize Your Account

```bash
gog auth add you@gmail.com
```

This opens a browser for OAuth consent. For headless environments, use:

```bash
gog auth add you@gmail.com --manual
```

To authorize with specific service scopes only:

```bash
gog auth add you@gmail.com --services calendar,gmail --force-consent
```

### 3. Multi-Account Setup (Optional)

Register additional accounts (e.g., personal + work):

```bash
gog auth add personal@gmail.com
gog auth add work@company.com
```

Set up aliases for convenience:

```bash
gog auth alias set personal personal@gmail.com
gog auth alias set work work@company.com
```

### 4. Set Default Account

```bash
export GOG_ACCOUNT=you@gmail.com
```

Or configure defaults interactively:

```bash
gog auth manage
```

### 5. Verify Authentication

```bash
# List registered accounts
gog auth list

# Check auth status
gog auth status
```

---

## Re-authentication

If the OAuth client is deleted or tokens expire:

```bash
# Register new OAuth credentials (if client was deleted)
gog auth credentials ~/Downloads/client_secret_NEW.json

# Re-authorize with force consent
gog auth add you@gmail.com --force-consent
```

---

## Basic Usage

Search unread emails from the past week:

```bash
gog gmail search 'is:unread newer_than:7d' --max 20
```

Extract subjects as JSON:

```bash
gog gmail search 'newer_than:7d' --max 50 --json | jq '.threads[] | .subject'
```

List upcoming calendar events:

```bash
gog calendar list --json
```

Export a Google Sheet as PDF:

```bash
gog sheets export <spreadsheetId> --format pdf --out ./sheet.pdf
```

### Output Formats

| Flag | Format |
|---|---|
| _(default)_ | Human-readable table |
| `--plain` | Tab-separated values (TSV) |
| `--json` | JSON for scripting |

---

## References

- [Official Documentation](https://gogcli.sh/)
- [GitHub Repository](https://github.com/steipete/gogcli)
