/**
 * Registration module — admin-tunable settings.
 *
 * Currently hosts the email-recipients config that the Cloud Function
 * `onRegStudentCreated` reads at delivery time. Single document for now;
 * extend with more fields as future settings emerge.
 */

import { fetchDoc, restSet } from "@/lib/firebase/rest-helpers";
import {
  REG_DEFAULT_ADMIN_NOTIFICATION_EMAILS,
  REG_EMAIL_FROM,
  REG_EMAIL_REPLY_TO,
} from "@/lib/registration/constants";

const SETTINGS_PATH = "regSettings/email-recipients";

export interface EmailRecipientsSettings {
  enabled: boolean;
  recipients: string[];
  from: string;
  replyTo: string;
  updatedBy?: string;
  updatedAt?: unknown;
}

export const EMAIL_SETTINGS_DEFAULTS: EmailRecipientsSettings = {
  enabled: true,
  recipients: REG_DEFAULT_ADMIN_NOTIFICATION_EMAILS,
  from: REG_EMAIL_FROM,
  replyTo: REG_EMAIL_REPLY_TO,
};

export async function getEmailSettings(): Promise<EmailRecipientsSettings> {
  const doc = await fetchDoc(SETTINGS_PATH);
  if (!doc) return EMAIL_SETTINGS_DEFAULTS;
  return {
    enabled: typeof doc.enabled === "boolean" ? doc.enabled : EMAIL_SETTINGS_DEFAULTS.enabled,
    recipients: Array.isArray(doc.recipients)
      ? (doc.recipients as string[]).filter((s) => typeof s === "string" && s.length > 0)
      : EMAIL_SETTINGS_DEFAULTS.recipients,
    from: typeof doc.from === "string" && doc.from ? doc.from : EMAIL_SETTINGS_DEFAULTS.from,
    replyTo:
      typeof doc.replyTo === "string" && doc.replyTo
        ? doc.replyTo
        : EMAIL_SETTINGS_DEFAULTS.replyTo,
  };
}

export async function saveEmailSettings(
  settings: EmailRecipientsSettings,
  actorUid: string
): Promise<void> {
  await restSet(SETTINGS_PATH, {
    enabled: settings.enabled,
    recipients: settings.recipients,
    from: settings.from,
    replyTo: settings.replyTo,
    updatedBy: actorUid,
    updatedAt: new Date(),
  });
}
