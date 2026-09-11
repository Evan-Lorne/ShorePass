"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  Children,
  isValidElement,
} from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options?: SelectOption[];
  placeholder?: string;
  onChange?: (e: { target: { value: string; name?: string; id?: string } }) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function Select({
  id,
  name,
  value: controlledValue,
  defaultValue,
  options: propsOptions,
  placeholder = "请选择",
  onChange,
  disabled = false,
  className = "",
  style,
  children,
}: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;

  // 解析 options：优先使用 props.options，其次从 children 的 <option> 中提取
  const options: SelectOption[] = React.useMemo(() => {
    if (propsOptions && propsOptions.length > 0) {
      return propsOptions;
    }
    const extracted: SelectOption[] = [];
    Children.forEach(children, (child) => {
      if (
        isValidElement<{ value?: unknown; children?: React.ReactNode; label?: string; disabled?: boolean }>(child) &&
        (child.type === "option" || child.props.value !== undefined)
      ) {
        const p = child.props;
        extracted.push({
          value: String(p.value ?? ""),
          label: String(p.children ?? p.label ?? p.value ?? ""),
          disabled: Boolean(p.disabled),
        });
      }
    });
    return extracted;
  }, [propsOptions, children]);

  const isControlled = controlledValue !== undefined;

  // 计算默认值：优先 defaultValue，若没传且非受控，若存在选项则尝试匹配
  const resolvedDefault = defaultValue !== undefined ? defaultValue : "";
  const [internalValue, setInternalValue] = useState<string>(
    isControlled ? controlledValue : resolvedDefault
  );

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const currentValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);

  const selectedOption = options.find((opt) => opt.value === currentValue);
  const displayText = selectedOption ? selectedOption.label : (currentValue === "" && options[0]?.value === "" ? options[0].label : placeholder);

  const selectValue = useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal);
      }
      if (onChange) {
        onChange({
          target: {
            value: newVal,
            name: name || id,
            id: selectId,
          },
        });
      }
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = newVal;
        hiddenSelectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [isControlled, onChange, name, id, selectId]
  );

  // 点击外部自动收起下拉框
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 打开时将高亮项对齐到当前已选项
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === currentValue);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, currentValue, options]);

  // 键盘聚焦选项时滚动可见
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // 键盘快捷键交互
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
      case "Tab":
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < options.length && options[next]?.disabled) {
            next++;
          }
          return next < options.length ? next : prev;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && options[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < options.length &&
          !options[highlightedIndex].disabled
        ) {
          selectValue(options[highlightedIndex].value);
        }
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${isOpen ? "is-open" : ""} ${className}`}
      style={style}
    >
      {/* 隐藏的原生 select：完全保障标准表单提交和无障碍 */}
      <select
        ref={hiddenSelectRef}
        id={`${selectId}-native`}
        name={name}
        value={currentValue}
        onChange={(e) => selectValue(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="custom-select-native"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* 自定义触发器按钮：绑定外部 label 的 htmlFor */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-listbox`}
        disabled={disabled}
        className={`custom-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="custom-select-label">{displayText}</span>
        <span className="custom-select-arrow" aria-hidden="true">
          <ChevronDown size={16} strokeWidth={2.2} />
        </span>
      </button>

      {/* 下拉浮层面板与选项 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id={`${selectId}-listbox`}
          role="listbox"
          className="custom-select-dropdown"
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                className={`custom-select-option ${isSelected ? "is-selected" : ""} ${
                  isHighlighted ? "is-focused" : ""
                } ${option.disabled ? "is-disabled" : ""}`}
                onClick={() => {
                  if (!option.disabled) {
                    selectValue(option.value);
                  }
                }}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setHighlightedIndex(index);
                  }
                }}
              >
                <span className="custom-select-option-text">{option.label}</span>
                {isSelected && (
                  <span className="custom-select-check" aria-hidden="true">
                    <Check size={15} strokeWidth={2.4} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
