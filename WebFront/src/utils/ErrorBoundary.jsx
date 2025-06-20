import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, errorType: null };

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorType: error.message?.includes('Jodit') ? 'jodit' : 'other'
    };
  }

  componentDidCatch(_error, _errorInfo) {
    
    if (this.state.errorType === 'jodit') {
      const editors = document.querySelectorAll('.jodit-container');
      editors.forEach(editor => {
        if (editor.parentNode) {
          editor.parentNode.removeChild(editor);
        }
      });
      
      setTimeout(() => {
        try {
          this.setState({ hasError: false, errorType: null });
        } catch (resetError) {
          console.error("Soft reset failed, forcing reload:", resetError);
          window.location.reload();
        }
      }, 100);
    }
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }

}