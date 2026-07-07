/**
 * Langford × Acceptix — Cloud Functions entry point.
 *
 * Each function is exported individually so `firebase deploy --only
 * functions:<name>` works for surgical deploys. Region pinned to
 * us-central1 to match the Firestore database location declared in
 * firebase.json.
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Registration module ─────────────────────────────────────────────────────

export { regCreateAcceptixAgent } from "./registration/create-agent";
export {
  regToggleAgentActive,
  regResetAgentPassword,
} from "./registration/manage-agent";
export { onRegStudentCreated } from "./registration/email-trigger";

// ─── Academic Organizer module ───────────────────────────────────────────────

export { orgCreateAcademicOrganizer } from "./organizer/create-organizer";
export {
  orgToggleOrganizerActive,
  orgResetOrganizerPassword,
} from "./organizer/manage-organizer";
