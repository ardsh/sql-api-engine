import React from 'react';
import ReactDOM from 'react-dom';
import { useContainerState } from './containerState';

type LogsProps = {
  isOpen?: boolean;
  onClose?: () => void;
};
const LogsModal = ({ isOpen, onClose }: LogsProps) => {
  if (!isOpen) return null;
  const logs = useContainerState(state => state.output);

  return ReactDOM.createPortal(
    <dialog open className="log-modal modal settings">
      <div className="modal-content">
        <div className="noselect spacebetween">
          <h2>Logs</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div
          className="log-content"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
          dangerouslySetInnerHTML={{ __html: logs.join('<br>') }}
        />
      </div>
    </dialog>,
    document.getElementById('root') ?? document.body,
  );
};

export default LogsModal;
