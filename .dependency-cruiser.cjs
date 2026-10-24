/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make modules hard to test and reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment:
        'Domain code is plain TypeScript: no framework, no I/O, no outer layers (ADR-006, LLD session-access §3).',
      from: { path: '^apps/server/src/[^/]+/domain/' },
      to: {
        path: [
          '^apps/server/src/[^/]+/(application|infrastructure|presentation)/',
          'node_modules/(@nestjs|ioredis|jsonwebtoken|argon2|socket\\.io|pg|typeorm|@prisma)',
        ],
      },
    },
    {
      name: 'application-not-to-outer-layers',
      severity: 'error',
      comment: 'Application depends on ports only, never on adapters or transport.',
      from: { path: '^apps/server/src/[^/]+/application/' },
      to: { path: '^apps/server/src/[^/]+/(infrastructure|presentation)/' },
    },
    {
      name: 'protocol-is-standalone',
      severity: 'error',
      comment: 'packages/protocol is the shared contract; it must not depend on any app.',
      from: { path: '^packages/protocol/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-legacy',
      severity: 'error',
      comment: 'legacy/ is frozen 2021 code and must never be imported.',
      from: {},
      to: { path: '^legacy/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage)/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
