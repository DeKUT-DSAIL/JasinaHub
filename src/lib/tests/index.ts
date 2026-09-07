import { smokeSuite } from "./suites/smoke";
import { authSuite } from "./suites/auth";
import { rlsSuite } from "./suites/rls";
import { rpcSuite } from "./suites/rpcs";
import { storageSuite } from "./suites/storage";
import { dataIntegritySuite } from "./suites/dataIntegrity";
import { businessRulesSuite } from "./suites/businessRules";
import { endToEndSuite } from "./suites/endToEnd";
import { regressionSuite } from "./suites/regression";
import { resilienceSuite } from "./suites/resilience";
import { accessibilitySuite } from "./suites/accessibility";
import { compatibilitySuite } from "./suites/compatibility";
import { performanceSuite } from "./suites/performance";
import { TestSuite } from "./types";

export const allSuites: TestSuite[] = [
  smokeSuite,
  authSuite,
  rlsSuite,
  rpcSuite,
  storageSuite,
  dataIntegritySuite,
  businessRulesSuite,
  endToEndSuite,
  regressionSuite,
  resilienceSuite,
  accessibilitySuite,
  compatibilitySuite,
  performanceSuite,
];

export * from "./types";
export * from "./runner";