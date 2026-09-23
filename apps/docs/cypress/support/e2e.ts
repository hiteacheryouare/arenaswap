// The support file exists for one reason: @cypress/code-coverage has to register its hooks from
// inside the browser. It reads `expose.coverage` and skips everything when that is false, which
// is every run that was not made against an instrumented build (see cypress.config.ts).
import '@cypress/code-coverage/support';
