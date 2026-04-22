import { Component, type ReactNode } from "react";

/**
 * Scoped error boundary for the JSON tree. Prevents a render error from
 * @uiw/react-json-view (triggered by a malformed value, a primitive root,
 * or an edge-case theme shape) from blanking the whole page.
 */
export class JSONErrorBoundary extends Component<
  { children: ReactNode; onError?: (err: Error) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-card border-x border-b-0 px-4 py-6 text-xs">
          <div className="text-foreground mb-1 font-semibold">
            Couldn't render the JSON tree
          </div>
          <div className="text-muted-foreground">
            {String(this.state.error.message)}
          </div>
          <div className="text-muted-foreground mt-2">
            Use <kbd className="bg-muted rounded border px-1 text-[10px]">View raw source</kbd>{" "}
            from the file actions menu to see the raw file.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
