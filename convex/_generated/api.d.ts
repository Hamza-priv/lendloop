/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assistant from "../assistant.js";
import type * as assistantAgent from "../assistantAgent.js";
import type * as assistantPrompt from "../assistantPrompt.js";
import type * as automation from "../automation.js";
import type * as crons from "../crons.js";
import type * as dev from "../dev.js";
import type * as domain_errors from "../domain/errors.js";
import type * as domain_loan from "../domain/loan.js";
import type * as domain_location from "../domain/location.js";
import type * as domain_permissions from "../domain/permissions.js";
import type * as domain_safety from "../domain/safety.js";
import type * as domain_tool from "../domain/tool.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_hmac from "../lib/hmac.js";
import type * as lib_images from "../lib/images.js";
import type * as loans from "../loans.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as outbox from "../outbox.js";
import type * as repositories_automationErrorRepository from "../repositories/automationErrorRepository.js";
import type * as repositories_loanRepository from "../repositories/loanRepository.js";
import type * as repositories_outboxRepository from "../repositories/outboxRepository.js";
import type * as repositories_reminderRepository from "../repositories/reminderRepository.js";
import type * as repositories_toolRepository from "../repositories/toolRepository.js";
import type * as repositories_userRepository from "../repositories/userRepository.js";
import type * as seed from "../seed.js";
import type * as services_automationService from "../services/automationService.js";
import type * as services_loanService from "../services/loanService.js";
import type * as services_messagingService from "../services/messagingService.js";
import type * as services_notificationService from "../services/notificationService.js";
import type * as services_outboxService from "../services/outboxService.js";
import type * as services_toolService from "../services/toolService.js";
import type * as services_userService from "../services/userService.js";
import type * as services_wantedService from "../services/wantedService.js";
import type * as services_watchService from "../services/watchService.js";
import type * as storage from "../storage.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";
import type * as wanted from "../wanted.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assistant: typeof assistant;
  assistantAgent: typeof assistantAgent;
  assistantPrompt: typeof assistantPrompt;
  automation: typeof automation;
  crons: typeof crons;
  dev: typeof dev;
  "domain/errors": typeof domain_errors;
  "domain/loan": typeof domain_loan;
  "domain/location": typeof domain_location;
  "domain/permissions": typeof domain_permissions;
  "domain/safety": typeof domain_safety;
  "domain/tool": typeof domain_tool;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/env": typeof lib_env;
  "lib/hmac": typeof lib_hmac;
  "lib/images": typeof lib_images;
  loans: typeof loans;
  messages: typeof messages;
  notifications: typeof notifications;
  outbox: typeof outbox;
  "repositories/automationErrorRepository": typeof repositories_automationErrorRepository;
  "repositories/loanRepository": typeof repositories_loanRepository;
  "repositories/outboxRepository": typeof repositories_outboxRepository;
  "repositories/reminderRepository": typeof repositories_reminderRepository;
  "repositories/toolRepository": typeof repositories_toolRepository;
  "repositories/userRepository": typeof repositories_userRepository;
  seed: typeof seed;
  "services/automationService": typeof services_automationService;
  "services/loanService": typeof services_loanService;
  "services/messagingService": typeof services_messagingService;
  "services/notificationService": typeof services_notificationService;
  "services/outboxService": typeof services_outboxService;
  "services/toolService": typeof services_toolService;
  "services/userService": typeof services_userService;
  "services/wantedService": typeof services_wantedService;
  "services/watchService": typeof services_watchService;
  storage: typeof storage;
  tools: typeof tools;
  users: typeof users;
  wanted: typeof wanted;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
