import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (error.message.includes('Jodit')) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    return this.state.hasError ? (
      <div className="error-fallback">
        Редактор перезагружается...
      </div>
    ) : this.props.children;
  }
}