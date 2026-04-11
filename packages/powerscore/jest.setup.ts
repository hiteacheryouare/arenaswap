process.env.TZ = 'UTC';

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
