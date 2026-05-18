# GitHub Actions — Required Setup

These workflows automate Firebase operations that Vercel doesn't touch.

## 1. `firebase-rules.yml` — Auto-deploy Firestore rules + indexes

**Triggers:** when `firestore.rules`, `firestore.indexes.json`, or `storage.rules` change on `main`.

**Required secret:**

- `FIREBASE_TOKEN` — generate by running locally:

  ```bash
  npx firebase-tools login:ci
  ```

  Then paste the printed token into GitHub:
  `Repo → Settings → Secrets and variables → Actions → New repository secret → name: FIREBASE_TOKEN`

## 2. `firestore-backup.yml` — Daily Firestore backup to Cloud Storage

**Triggers:** daily at 02:00 UTC (05:00 Kuwait) + manual dispatch.

**Required secrets:**

- `GCP_SA_KEY` — JSON key of a Google Cloud service account with:
  - `roles/datastore.importExportAdmin` on project `langford-system`
  - `roles/storage.admin` on the backup bucket

  Create at: <https://console.cloud.google.com/iam-admin/serviceaccounts?project=langford-system>

- `BACKUP_BUCKET` — full `gs://` URL of a Cloud Storage bucket dedicated to backups.

  Create the bucket once:

  ```bash
  gcloud storage buckets create gs://langford-firestore-backups \
    --project=langford-system \
    --location=us-central1 \
    --uniform-bucket-level-access
  ```

  Then set a 30-day lifecycle for automatic cleanup:

  ```bash
  cat > /tmp/lifecycle.json <<'EOF'
  {"lifecycle":{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}}
  EOF
  gcloud storage buckets update gs://langford-firestore-backups \
    --lifecycle-file=/tmp/lifecycle.json
  ```

## Testing a workflow manually

GitHub → Actions tab → pick the workflow → "Run workflow" button.
