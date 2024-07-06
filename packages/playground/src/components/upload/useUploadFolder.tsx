import React from 'react';

export function useUploadFolder() {
  const folderInput = React.useRef(null as any);
  const input = (
    <label>
      Mount Folder
      <input ref={folderInput} directory="" webkitdirectory="" type="file" className="folder-input" />
    </label>
  );

  const getFiles = () => {
    console.log(folderInput.current.files);
    for (const file of folderInput.current.files) {
      const reader = new FileReader();
      console.log(file);
      const name = file.webkitRelativePath || file.name;
      reader.onload = e => {
        console.log(name, ':\n', e.target?.result || '');
      };
      reader.readAsText(file);
    }
  };
  return {
    input,
    getFiles,
  };
}

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}
