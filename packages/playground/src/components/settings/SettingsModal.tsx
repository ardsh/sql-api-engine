import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { SettingsType, useSettingsStore } from './settingsState';

type SettingsProps = {
  isOpen?: boolean;
  onClose?: () => void;
};
const SettingsModal = ({ isOpen, onClose }: SettingsProps) => {
  if (!isOpen) return null;
  const { setSettings, settings } = useSettingsStore();

  const [localSettings, setLocalSettings] = useState(settings);

  function setLocalState<TSetting extends keyof SettingsType>(key: TSetting, value: SettingsType[TSetting]) {
    return setLocalSettings(prevState => ({
      ...prevState,
      [key]: value,
    }));
  }

  const saveSettings = () => {
    setSettings(localSettings);
    onClose?.();
  };

  return ReactDOM.createPortal(
    <dialog open className="modal settings">
      <div className="modal-content">
        <div className="spacebetween noselect">
          <h2>Settings</h2>
          <button onClick={onClose} style={{ marginTop: -5, height: 32, width: 32 }}>
            &times;
          </button>
        </div>
        <form>
          {false && (
            <label>
              Database URL:
              <input
                type="text"
                name="databaseUrl"
                value={localSettings.databaseUrl}
                onChange={e => setLocalState('databaseUrl', e.target.value)}
                placeholder="postgresql://username:password@localhost:5432/postgres"
              />
            </label>
          )}
          <label>
            Show Query Parameters:
            <input
              style={{ width: 20 }}
              type="checkbox"
              name="showValues"
              checked={localSettings.showValues}
              onChange={e => setLocalState('showValues', e.target.checked)}
            />
          </label>
          <label>
            Format Queries:
            <input
              style={{ width: 20 }}
              type="checkbox"
              name="formatQueries"
              checked={localSettings.formatQuery}
              onChange={e => setLocalState('formatQuery', e.target.checked)}
            />
          </label>
          <label>
            Save Delay (ms):
            <input
              type="number"
              name="saveDelay"
              value={localSettings.saveDelay}
              onChange={e => setLocalState('saveDelay', Number(e.target.value))}
              min="0"
              max="2000"
              step="100"
            />
          </label>
          <label>
            Module Type:
            <select
              name="moduleType"
              value={localSettings.moduleType}
              onChange={e => setLocalState('moduleType', e.target.value === 'commonjs' ? 'commonjs' : 'esm')}
            >
              <option value="esm">ESM</option>
              <option value="commonjs">CommonJS</option>
            </select>
          </label>
          <button style={{ marginTop: 10 }} onClick={saveSettings}>
            Save
          </button>
        </form>
      </div>
    </dialog>,
    document.getElementById('root') ?? document.body,
  );
};

export default SettingsModal;
