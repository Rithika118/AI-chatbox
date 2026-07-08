import React, { useRef } from 'react';

const PdfUploader = ({ onUpload, label, accept = '.pdf,.docx,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) => {
  const fileInput = useRef();

  const handleChange = (e) => {
    if (e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#2563eb' }}>
        <span>{label}</span>
        <input type="file" accept={accept} ref={fileInput} onChange={handleChange} style={{ display: 'none' }} />
      </label>
    </div>
  );
};

export default PdfUploader;
