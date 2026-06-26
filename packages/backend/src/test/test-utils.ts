import { ExecutionContext } from '@nestjs/common';

export function createMockContext(overrides: { headers?: Record<string, string>; body?: any } = {}): ExecutionContext {
  const req: any = {
    headers: {},
    body: undefined,
    ...overrides,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
    }),
  } as any;
}

export function createMockPrisma() {
  return {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organizationMembership: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  } as any;
}

export function createMockCls() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    run: jest.fn((fn: () => void) => fn()),
  } as any;
}
