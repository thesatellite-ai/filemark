import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

interface TabProps {
  label: string;
  children?: ReactNode;
}

export function Tab(_: TabProps) {
  return null;
}
Tab.displayName = "Tab";

export function Tabs({ children }: { children?: ReactNode }) {
  const tabs = Children.toArray(children).filter(
    (c): c is ReactElement<TabProps> =>
      isValidElement(c) &&
      (c.type as { displayName?: string }).displayName === "Tab"
  );
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  return (
    <div className="fv-tabs">
      <div className="fv-tabs-list" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            className={`fv-tab-btn ${i === active ? "is-active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.props.label}
          </button>
        ))}
      </div>
      <div className="fv-tab-panel" role="tabpanel">
        {tabs[active]?.props.children}
      </div>
    </div>
  );
}
