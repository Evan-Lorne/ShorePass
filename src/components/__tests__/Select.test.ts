import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import Select from "../Select";

describe("Select Component", () => {
  it("renders correctly with options props", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(Select, {
        id: "test-select",
        name: "testName",
        defaultValue: "opt2",
        options: [
          { value: "opt1", label: "选项一" },
          { value: "opt2", label: "选项二" },
        ],
      })
    );

    expect(html).toContain("选项二");
    expect(html).toContain("custom-select-trigger");
    expect(html).toContain("custom-select-native");
    expect(html).toContain('name="testName"');
    expect(html).toContain('value="opt2"');
  });

  it("extracts options from children correctly", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(
        Select,
        {
          id: "children-select",
          name: "region",
          defaultValue: "national",
        },
        React.createElement("option", { value: "" }, "全部地区"),
        React.createElement("option", { value: "national" }, "全国卷"),
        React.createElement("option", { value: "jiangsu" }, "江苏卷")
      )
    );

    expect(html).toContain("全国卷");
    expect(html).toContain('value="national"');
    expect(html).toContain('value="jiangsu"');
  });

  it("handles empty default value gracefully", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(
        Select,
        {
          id: "empty-select",
          defaultValue: "",
        },
        React.createElement("option", { value: "" }, "全部地区"),
        React.createElement("option", { value: "national" }, "全国卷")
      )
    );

    expect(html).toContain("全部地区");
  });
});
