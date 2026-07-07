/**
 * Typed wrappers for the Cloud Functions used by the registration module.
 *
 * Centralizing the `httpsCallable` creation here keeps the call sites
 * compact and gives every call site a single, ergonomic typed surface.
 * Region pinned to `us-central1` to match what's deployed (and what's
 * declared in firebase.json's functions block).
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./config";

const FUNCTIONS_REGION = "us-central1";

const functions = getFunctions(app, FUNCTIONS_REGION);

// ─── Agent lifecycle ─────────────────────────────────────────────────────────

export interface CreateAgentPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface CreateAgentResult {
  uid: string;
  email: string;
  fullName: string;
}

export const callCreateAcceptixAgent = httpsCallable<
  CreateAgentPayload,
  CreateAgentResult
>(functions, "regCreateAcceptixAgent");

export interface ToggleAgentActivePayload {
  uid: string;
  isActive: boolean;
}

export interface ToggleAgentActiveResult {
  uid: string;
  isActive: boolean;
}

export const callToggleAgentActive = httpsCallable<
  ToggleAgentActivePayload,
  ToggleAgentActiveResult
>(functions, "regToggleAgentActive");

export interface ResetAgentPasswordPayload {
  uid: string;
  password: string;
}

export interface ResetAgentPasswordResult {
  uid: string;
  ok: boolean;
}

export const callResetAgentPassword = httpsCallable<
  ResetAgentPasswordPayload,
  ResetAgentPasswordResult
>(functions, "regResetAgentPassword");

// ─── Academic Organizer lifecycle ────────────────────────────────────────────

export interface CreateOrganizerPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface CreateOrganizerResult {
  uid: string;
  email: string;
  fullName: string;
}

export const callCreateAcademicOrganizer = httpsCallable<
  CreateOrganizerPayload,
  CreateOrganizerResult
>(functions, "orgCreateAcademicOrganizer");

export const callToggleOrganizerActive = httpsCallable<
  ToggleAgentActivePayload,
  ToggleAgentActiveResult
>(functions, "orgToggleOrganizerActive");

export const callResetOrganizerPassword = httpsCallable<
  ResetAgentPasswordPayload,
  ResetAgentPasswordResult
>(functions, "orgResetOrganizerPassword");
