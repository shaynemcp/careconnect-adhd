import { Component, createRef, type ErrorInfo, type ReactNode } from 'react';
import { BASE_URL } from '../config/basePath';

interface Props {
  children: ReactNode;
  /** When this changes (the route), a shown error is cleared so the next screen can render. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render error anywhere below it and shows a calm recovery screen instead of a
 * blank page (A11 Part 1). The usual real-world cause is a route chunk that fails to load,
 * for example after a new deploy replaced the old file names; a reload fixes that.
 *
 * The message is announced (role="alert") and the heading takes focus, so a screen reader or
 * keyboard user lands on it rather than on a control that no longer exists. Moving to another
 * route (`resetKey`) clears the error.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  private readonly headingRef = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept for debugging; there is no error reporting service in this prototype.
    console.error('CareConnect hit an error it could not recover from:', error, info.componentStack);
  }

  // An error on the first render mounts the boundary already showing the message.
  componentDidMount() {
    if (this.state.error) this.headingRef.current?.focus();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.error && !prevState.error) {
      this.headingRef.current?.focus();
    } else if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section role="alert" aria-labelledby="error-boundary-heading" className="max-w-xl mx-auto p-6 md:p-10">
        <h1
          id="error-boundary-heading"
          ref={this.headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-neutral-900 mb-3"
        >
          Something went wrong
        </h1>
        <p className="text-lg text-neutral-700 mb-6">
          This screen didn't load. Your information is safe on this device. Reloading usually fixes it.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-5 rounded-lg bg-calm-600 text-white font-semibold"
          >
            Reload the page
          </button>
          <a
            href={`${BASE_URL}app`}
            className="min-h-[44px] px-5 rounded-lg border-2 border-calm-600 text-calm-700 font-semibold inline-flex items-center"
          >
            Go to today's home
          </a>
        </div>
      </section>
    );
  }
}
