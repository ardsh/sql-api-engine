module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-shared`
  extends: ['shared'],
  settings: {
    next: {
      rootDir: ['apps/*/']
    }
  }
}
