export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^ogl$': '<rootDir>/test/__mocks__/ogl.js',
    '^matter-js$': '<rootDir>/test/__mocks__/matter-js.js'
  },
};
