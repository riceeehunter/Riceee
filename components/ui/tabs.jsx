"use client";

import { useState } from "react";

export function Tabs({ activeTab, onChange, children }) {
  return (
    <div className="tabs-container">
      <div className="tabs-header flex space-x-4 border-b border-gray-700">
        {children.map((child) => (
          <button
            key={child.props.id}
            className={`tab-button px-4 py-2 ${
              activeTab === child.props.id ? "text-pastel-violet border-b-2 border-pastel-violet" : "text-gray-400"
            }`}
            onClick={() => onChange(child.props.id)}
          >
            {child.props.label}
          </button>
        ))}
      </div>
      <div className="tabs-content mt-4">
        {children.find((child) => child.props.id === activeTab)}
      </div>
    </div>
  );
}

export function Tab({ children }) {
  return <div>{children}</div>;
}