import { Component } from "react";
import { Button } from "../ui/button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Route render error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="section-shell py-16">
          <div className="card mx-auto max-w-2xl space-y-4 rounded-[2rem] border border-gold/15 p-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cocoa/55">
              Something Went Wrong
            </p>
            <h1 className="text-3xl font-semibold text-espresso">
              We hit an unexpected error on this page.
            </h1>
            <p className="text-sm leading-6 text-cocoa/65">
              Try refreshing this view. If it keeps happening, we can trace it from the console and fix it cleanly.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.location.assign("/")}
              >
                Go Home
              </Button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
