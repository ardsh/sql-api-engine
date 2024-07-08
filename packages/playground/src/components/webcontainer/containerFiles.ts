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
        isCJS ? 'node --require=ts-node/register' : 'node --loader=ts-node/esm --loader=import-in-the-middle/hook.mjs'
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
                  setTimeout(() => console.log(JSON.stringify(sql)), 100);
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
      makeQueryLoader,
    };`
        : ''
    }
  });
  console.log('===INIT===');
  process.on('uncaughtException', (error) => {
    console.error(error)
  });
  process.on('unhandledRejection', (error) => {
    console.error(error)
  });

  try {
    ${importRequire}('./demo.ts').catch(console.error)
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
