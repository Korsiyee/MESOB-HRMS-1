import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFViewer = ({ file, width = 600, showControls = true }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(err) {
    console.error('Error loading PDF:', err);
    setError('Failed to load PDF. Please try again.');
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  const styles = {
    container: {
      border: '1px solid rgba(0,80,60,0.12)',
      borderRadius: '10px',
      overflow: 'hidden',
      backgroundColor: '#f9f9f9',
    },
    viewerWrapper: {
      display: 'flex',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#e5e5e5',
      minHeight: '400px',
      position: 'relative',
    },
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      backgroundColor: '#fff',
      borderTop: '1px solid rgba(0,80,60,0.12)',
    },
    button: {
      padding: '6px 16px',
      borderRadius: '6px',
      border: '1px solid rgba(0,80,60,0.2)',
      backgroundColor: '#fff',
      color: '#0F766E',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: 600,
      fontFamily: 'Poppins, sans-serif',
      transition: 'all 0.2s',
    },
    pageInfo: {
      fontSize: '0.85rem',
      color: '#1A2E2B',
      fontWeight: 500,
    },
    error: {
      padding: '40px',
      textAlign: 'center',
      color: '#DC2626',
      fontSize: '0.9rem',
    },
    loading: {
      padding: '40px',
      textAlign: 'center',
      color: '#2E6058',
      fontSize: '0.9rem',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.viewerWrapper}>
        {error ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div style={styles.loading}>Loading PDF...</div>}
          >
            <Page 
              pageNumber={pageNumber} 
              width={width}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </div>
      
      {showControls && numPages && !error && (
        <div style={styles.controls}>
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            style={{
              ...styles.button,
              opacity: pageNumber <= 1 ? 0.5 : 1,
              cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => pageNumber > 1 && (e.currentTarget.style.backgroundColor = '#f0f9f8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            Previous
          </button>
          
          <span style={styles.pageInfo}>
            Page {pageNumber} of {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            style={{
              ...styles.button,
              opacity: pageNumber >= numPages ? 0.5 : 1,
              cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => pageNumber < numPages && (e.currentTarget.style.backgroundColor = '#f0f9f8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
