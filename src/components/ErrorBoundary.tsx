import { Component, ErrorInfo, ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary:${this.props.label || "unknown"}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb__wrap">
          <div className="eb__card">
            <div className="eb__header">
              <div className="eb__eyebrow">SYSTEM FAULT</div>
              <div className="eb__title">
                {this.props.label
                  ? `${this.props.label} — Module Error`
                  : "Application Error"}
              </div>
            </div>

            <div className="eb__body">
              <div className="eb__message">
                {this.state.error?.message || "An unexpected error occurred"}
              </div>

              <div className="eb__actions">
                <button className="btn btn--primary btn--sm" onClick={this.handleReset}>
                  Retry Module
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>

              {this.state.errorInfo && (
                <details className="eb__details">
                  <summary className="eb__details-summary">Technical Details</summary>
                  <pre className="eb__stack">
                    {this.state.error?.stack}
                    {"\n\nComponent Stack:"}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
