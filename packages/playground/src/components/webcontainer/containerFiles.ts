import type { FileSystemTree } from '@webcontainer/api';
import { useSettingsStore } from '../settings/settingsState';

const getPackageJsonFile = () => {
  const isCJS = useSettingsStore.getState().settings.moduleType === 'commonjs';
  // TODO: Make dependencies dynamic through settings.
  return `
  {
    "name": "sql-playground",
    "type": "${isCJS ? 'commonjs' : 'module'}",
    "dependencies": {
      "import-in-the-middle": "^1.8.1",
      "require-in-the-middle": "^7.3.0",
      "slonik": "^33.0.3",
      "slonik-trpc": "latest",
      "sql-api-engine": "latest",
      "ts-node": "^10.9.2",
      "typescript": "^5.0.0",
      "zod": "^3.19.1"
    },
    "scripts": {
      "start": "${
        isCJS
          ? 'node --no-warnings --require=ts-node/register'
          : 'node --no-warnings --loader=ts-node/esm --loader=import-in-the-middle/hook.mjs'
      } mainFile.ts"
    }
  }`;
};

const getTsConfigFile = () => {
  const isCJS = useSettingsStore.getState().settings.moduleType === 'commonjs';
  return `
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "${isCJS ? 'commonjs' : 'esnext'}",
      "strict": false,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true
    },
    "ts-node": {
      "transpileOnly": true
    },
    "include": ["./**/*.ts"],
    "exclude": ["node_modules", "dist"]
  }`;
};

function getMainFileContents() {
  const isCJS = useSettingsStore.getState().settings.moduleType === 'commonjs';
  const importRequire = isCJS ? 'require' : 'import';
  return `
  import http from 'http';
  import { exec } from 'child_process';
  import { Hook } from '${importRequire}-in-the-middle';
  import * as fs from 'fs';
  import * as path from 'path';

  fs.watch('./', { encoding: 'buffer' }, (eventType, filename) => {
    if (eventType === 'rename' && filename.toString().startsWith('demo') && filename.toString().endsWith('.ts')) {
      try {
        ${importRequire}(path.resolve('./', filename.toString()))
        .catch(error => {
          console.error('Error loading code:', error);
        });
      } catch (e) {}
    }
  });
  ${isCJS ? 'new ' : ''}Hook(['slonik-trpc', 'sql-api-engine/engine'], (exported, name, baseDir) => {
    ${isCJS ? 'const makeQueryLoader' : 'exported.makeQueryLoader'} = new Proxy(exported.makeQueryLoader, {
      apply(target, ctx, args) {
        const onLoad = (options) => {
          if (options?.query) {
            console.log(JSON.stringify(options.query));
          }
          if (options?.countQuery) {
            console.log(JSON.stringify({
              count: true,
              ...options.countQuery,
            }));
          }
        }
          const loader = Function.prototype.apply.apply(target, [ctx, [{
            ...args[0],
            db: {
                any: () => {
                    return Promise.resolve([]);
                }
            },
            plugins: [
              ...args[0]?.plugins || [],
              {
                  onLoad,
                  onLoadPagination: onLoad,
              }
            ]
          }, ...args.slice(1)]]);
          return loader;
      }
    });
    ${isCJS ? 'const buildView' : 'exported.buildView'} = new Proxy(exported.buildView, {
      apply(target, ctx, args) {
        const view = Function.prototype.apply.apply(target, [ctx, args]);
        view.load = new Proxy(view.load, {
          apply(target, ctx, args) {
            try {
              args[0].db = {
                any: (sql, values) => {
                  setTimeout(() => console.log(JSON.stringify(sql)), 10);
                }
              }
            } catch (e) {
              console.log(JSON.stringify(e));
            }
            const result = Function.prototype.apply.apply(target, [ctx, args]);
            return result;
          }
        });
        return view;
      }
    });
    ${isCJS ? 'const sqlWith' : 'if (exported.sqlWith) exported.sqlWith'} = new Proxy(exported.sqlWith || {}, {
      apply(target, ctx, args) {
        const view = Function.prototype.apply.apply(target, [ctx, args]);
        view.runDB = new Proxy(view.runDB, {
          apply(target, ctx, args) {
            console.log("View", target, args);
            try {
              if (!args[1]) args[1] = {};
              args[1].db = {
                any: (sql, values) => {
                  setTimeout(() => console.log(JSON.stringify(sql)), 10);
                }
              }
            } catch (e) {
              console.log(JSON.stringify(e));
            }
            const result = Function.prototype.apply.apply(target, [ctx, args]);
            return result;
          }
        });
        return view;
      }
    });
    ${
      isCJS
        ? `return {
      ...exported,
      buildView,
      ...(exported.sqlWith && { sqlWith }),
      makeQueryLoader,
    };`
        : ''
    }
  });
  ${isCJS ? 'new ' : ''}Hook(['pg'], (exported, name, baseDir) => {
    const Client = exported.default?.Client || exported.Client;
    Client.prototype.query = (text, values) => {
      if (!Array.isArray(values)) values = [];
      if (text?.text || text?.values || text?.sql) {
        console.log(JSON.stringify({ sql: text?.sql || text?.text, values: text?.values || values || [] }));
      } else if (typeof text === 'string') {
        console.log(JSON.stringify({ sql: text, values }));
      }
    }
    Client.prototype.connect = (args) => {
    }
    ${
      isCJS
        ? `return {
      ...exported,
      Client,
      default: {
        ...exported.default,
        Client,
      },
    };`
        : ''
    }
  });

  ${isCJS ? 'new ' : ''}Hook(['slonik'], (exported, name, baseDir) => {
    const createMockPool = new Proxy(exported.createMockPool, {
      apply(target, ctx, args) {
        const db = Function.prototype.apply.apply(target, [ctx, args]);
        const logQuery = (sql) => {
          if (sql?.sql) {
            setTimeout(() => console.log(JSON.stringify(sql)), 10);
          }
        };
        const spyMethod = (method) => {
          db[method] = new Proxy(db[method], {
            apply(target, ctx, args) {
              try {
                logQuery(args[0]);
              } catch (e) {
                console.log(JSON.stringify(e));
              }
              return Promise.resolve({});
            }
          });
        }
        Object.keys(db).forEach(key => spyMethod(key));
        db['transaction'] = (cb) => {
          return cb(db);
        }
        return db;
      }
    });
    ${
      isCJS
        ? `return {
      ...exported,
      createMockPool,
      createPool: createMockPool,
    };`
        : 'exported.createPool = createMockPool; exported.createMockPool = createMockPool;'
    }
  });
  console.log('===INIT===');
  process.removeAllListeners('warning');
  process.on('uncaughtException', (error) => {
    console.error(error)
  });
  process.on('unhandledRejection', (error) => {
    console.error(error)
  });

  try {
    ${importRequire}('./demo.ts')${isCJS ? '' : '.catch(console.error)'}
  } catch (e) {
    console.error(e);
  }
`;
}
export const containerFiles: FileSystemTree = {
  'demo.ts': {
    file: {
      contents: useSettingsStore.getState().settings.code,
    },
  },
  'mainFile.ts': {
    file: {
      contents: getMainFileContents(),
    },
  },
  'tsconfig.json': {
    file: {
      contents: getTsConfigFile(),
    },
  },
  'package.json': {
    file: {
      contents: getPackageJsonFile(),
    },
  },
};
