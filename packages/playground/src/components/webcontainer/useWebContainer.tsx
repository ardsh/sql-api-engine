import { useEffect, useState, useRef } from 'react';
import { WebContainer, WebContainerProcess } from '@webcontainer/api';
import ANSIToHTML from 'ansi-to-html';

import { containerFiles } from './containerFiles';
import { addContainerOutput, addSqlQuery, setContainerState } from './containerState';
import { useDemoCode, useSettingsStore } from '../settings/settingsState';
import { useDebounceEffect } from '@/utils/useDebounceEffect';

const ansiConverter = new ANSIToHTML();

let webContainer: Promise<WebContainer> | null = null;

export function useWebContainer() {
  const demoCode = useDemoCode();
  const webContainerInstanceRef = useRef<WebContainer | null>(null);
  const startProcessRef = useRef<WebContainerProcess | undefined>();
  const initPromise = useRef<Promise<void>>();
  const resetRef = useRef(true);
  const restartRef = useRef(false);

  const restart = async () => {
    startProcessRef.current?.kill();
    await webContainerInstanceRef.current?.spawn('killall', ['node']);
    await initPromise.current;
    setContainerState('output', ['Starting...']);
    await new Promise(res => setTimeout(res, 100));
    startProcessRef.current = await webContainerInstanceRef.current?.spawn('yarn', ['start']);

    restartRef.current = false;
    resetRef.current = true;
    startProcessRef.current?.exit.then(() => (restartRef.current = true)).catch(() => (restartRef.current = true));
    startProcessRef.current?.output.pipeTo(
      new WritableStream({
        write(data) {
          try {
            if (data.indexOf('===INIT===') >= 0) {
              setContainerState('status', 'starting');
              resetRef.current = true;
            }
            const query = JSON.parse(data);
            if (query.sql && query.values && (!query.count || useSettingsStore.getState().settings.showCountQuery)) {
              if (resetRef.current || restartRef.current) {
                resetRef.current = false;
                setContainerState('queries', []);
              }
              addSqlQuery(query);
              setContainerState('status', 'ready');
            }
          } catch (error) {
            addContainerOutput(ansiConverter.toHtml(data));
          }
        },
      }),
    );
  };

  const initialize = async () => {
    if (webContainer) {
      webContainerInstanceRef.current = await webContainer;
    }
    if (!webContainerInstanceRef.current) {
      webContainer = WebContainer.boot();
      webContainerInstanceRef.current = await webContainer;
    }

    // mounting tree of files into filesystem
    await webContainerInstanceRef.current.mount(containerFiles);

    const install = await webContainerInstanceRef.current.spawn('yarn', ['install']);
    setContainerState('output', ['Installing dependencies...']);

    const exitCode = await install.exit;
    if (exitCode !== 0) {
      throw new Error('Installation failed');
    }
  };

  useDebounceEffect(
    () => {
      if (demoCode) {
        const fileName = `/demo-${Date.now()}.ts`;
        if (restartRef.current) {
          webContainerInstanceRef.current?.fs.writeFile('/demo.ts', demoCode);
          restart();
          console.log('Restarting process');
        }
        webContainerInstanceRef.current?.fs.writeFile(fileName, demoCode);
        resetRef.current = true;
      }
    },
    [demoCode],
    100,
  );
  useEffect(() => {
    const bootWebContainer = async () => {
      initPromise.current = initialize();
      await initPromise.current;
      // running server
      await restart();

      // listening for events
      webContainerInstanceRef.current?.on('server-ready', (_: any, url: any) => {
        setContainerState('url', url);
      });
    };

    bootWebContainer();
  }, []);

  return {
    webContainerInstanceRef,
    restart,
  };
}
