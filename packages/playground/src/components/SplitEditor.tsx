import React, { useMemo } from 'react';
import type { DiffEditorProps, EditorProps } from '@monaco-editor/react';
import SplitEdit, { SplitProps } from 'react-split';
import { useSqlQueries } from './webcontainer/containerState';
import { setSettings, useDemoCode } from './settings/settingsState';
import { DEFAULT_DEMO_CODE } from './webcontainer/files';
import slonikTrpc from '../../slonik-trpc.d.ts?raw';

const slonikFiles = import.meta.glob<string>('../../node_modules/slonik/dist/**/*.d.ts', { eager: true, as: 'raw' });
const zodFiles = import.meta.glob<string>('../../node_modules/zod/**/*.d.ts', { eager: true, as: 'raw' });
const coreFiles = import.meta.glob<string>('../../../core/engine/dist/**/*.d.ts', { eager: true, as: 'raw' });

const Editor: any = React.lazy(() => import('@monaco-editor/react').then(mod => ({ default: mod.Editor as any })));
const Split = SplitEdit as any;
const options: DiffEditorProps = {
  options: {
    fontSize: 16,
    minimap: {
      enabled: false,
    },
  },
  height: '90vh',
  theme: 'vs-dark',
  beforeMount: monaco => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare module 'slonik-trpc' { ${slonikTrpc} }`,
      'file:///node_modules/slonik-trpc/index.d.ts',
    );
    const slonikText = Object.keys(slonikFiles)
      .map(file => {
        return slonikFiles[file];
      })
      .join('\n\n');
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare module 'slonik' { ${slonikText} }`,
      'file:///node_modules/slonik/index.d.ts',
    );
    Object.keys(zodFiles).forEach(file => {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        !file.endsWith('index.d.ts') ? `declare module 'zod' { ${zodFiles[file]} }` : zodFiles[file],
        'file:///node_modules/zod/' + file.substring(34),
      );
    });
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `declare module 'zod' { import * as z from 'zod'; export { z } }`,
      'file:///node_modules/zod/index.d.ts',
    );
    Object.keys(coreFiles).forEach(file => {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `declare module 'sql-api-engine/engine' { ${coreFiles[file]} }`,
        'file:///node_modules/sql-api-engine/engine/' + file.substring(34),
      );
    });
    if (!coreFiles.length) {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `declare module 'sql-api-engine/engine' { ${slonikTrpc} }`,
        'file:///node_modules/sql-api-engine/engine/index.d.ts',
      );
    }
  },
};

const aProps: EditorProps = {
  language: 'typescript',
  onChange: value => (value ? setSettings({ code: value }) : setSettings({ code: DEFAULT_DEMO_CODE })),
  onMount(editor) {
    editor.revealLine((editor.getModel()?.getLineCount() || 80) - 20);
  },
};

const bProps: EditorProps = {
  language: 'sql',
};

const SplitEditor = () => {
  return (
    <Split
      className="split"
      sizes={[55, 45]}
      minSize={100}
      cursor="col-resize"
      expandToMin={false}
      gutterSize={6}
      gutterAlign="center"
      snapOffset={0}
      direction="horizontal"
    >
      <Editor defaultValue={useDemoCode() || DEFAULT_DEMO_CODE} {...aProps} {...options} />
      <Editor value={useSqlQueries()} {...bProps} {...options} />
    </Split>
  );
};

export default SplitEditor;
