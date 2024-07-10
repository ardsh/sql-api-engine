import React from 'react';
import ReactDOM from 'react-dom';
import Terminal from './Terminal';
import '@xterm/xterm/css/xterm.css';
import type { WebContainer } from '@webcontainer/api';

type TerminalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  webContainerRef?: React.RefObject<WebContainer>;
};
const TerminalModal = ({ isOpen, onClose, webContainerRef }: TerminalProps) => {
  return ReactDOM.createPortal(
    <dialog open className="modal settings" style={isOpen ? {} : { display: 'none' }}>
      <div className="modal-content">
        <div className="noselect spacebetween">
          <h2>Terminal</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <Terminal webContainerRef={webContainerRef} />
      </div>
    </dialog>,
    document.getElementById('root') ?? document.body,
  );
};

export default TerminalModal;
