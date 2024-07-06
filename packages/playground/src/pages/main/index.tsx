import React, { useMemo } from 'react';
import SplitEditor from '@/components/SplitEditor';
import SettingsModal from '@/components/settings/SettingsModal';
import { useUploadFolder } from '@/components/upload/useUploadFolder';
import LogsModal from '@/components/webcontainer/LogsModal';
import { useWebContainer } from '@/components/webcontainer/useWebContainer';

const Main = () => {
  const env: 'development' | 'production' = useMemo(() => {
    return import.meta.env.VITE_TEST || process.env.NODE_ENV === 'test' ? 'development' : 'production';
  }, []);
  const [showModal, setShowModal] = React.useState(false);
  const [showLogs, setShowLogs] = React.useState(false);
  const { restart } = useWebContainer();
  // const { input, getFiles } = useUploadFolder();

  return (
    <>
      <div id="header">
        {/* {input} */}
        <button onClick={() => setShowModal(show => !show)}>Settings</button>
        <SettingsModal isOpen={showModal} onClose={() => setShowModal(false)} />
        {/* <button onClick={getFiles}>Run</button> */}
        <button onClick={() => setShowLogs(show => !show)}>Logs</button>
        <LogsModal isOpen={showLogs} onClose={() => setShowLogs(false)} />
        <button onClick={restart}>Run</button>
      </div>
      <div id="main">
        <SplitEditor />
      </div>
    </>
  );
};

export default Main;
