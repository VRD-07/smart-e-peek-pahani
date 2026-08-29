import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col flex-1 p-6 max-w-md mx-auto w-full items-center justify-center min-h-[60vh] text-center">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 w-full space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">तांत्रिक अडचण आली</h2>
            <p className="text-xs text-gray-500">
              {this.state.error?.message || 'अपेक्षित त्रुटी आढळली. कृपया पुन्हा प्रयत्न करा.'}
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>पुन्हा प्रयत्न करा (Retry)</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>मुख्य पृष्ठावर जा (Home)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

