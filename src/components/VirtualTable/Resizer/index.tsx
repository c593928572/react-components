import React from "react";

export interface ResizerProps {
  direction: "vertical" | "horizontal"; //暂时不支持水平方向
  resizeDom: string | HTMLElement | (() => HTMLElement);
  size?: {
    min?: number | (() => number);
    max?: number | (() => number);
    reset?: number | (() => number);
  };
  //拉伸结束
  onResizeEnd?: (height: number) => void;
  children: React.ReactElement;
}

const Resizer: React.FC<ResizerProps> = ({
  direction,
  children,
  resizeDom,
  size,
  onResizeEnd,
}) => {
  const reize = (
    e1: MouseEvent,
    e2: MouseEvent,
    origin: { width: number; height: number },
    dom: HTMLElement
  ) => {
    if (direction === "vertical") {
      dom.style.height =
        getFixedSize(origin.height + (e2.clientY - e1.clientY)) + "px";
    } else {
      dom.style.width =
        getFixedSize(origin.width + (e2.clientX - e1.clientX)) + "px";
    }
  };

  const getFixedSize = (x: number) => {
    const min = typeof size?.min === "function" ? size?.min() : size?.min ?? 0;
    const max =
      typeof size?.max === "function" ? size?.max() : size?.max ?? 99999;
    return Math.max(min, Math.min(x, max));
  };

  const onMouseDown = (e1: MouseEvent) => {
    const dom =
      resizeDom instanceof HTMLElement
        ? resizeDom
        : typeof resizeDom === "function"
        ? resizeDom()
        : document.getElementById(resizeDom);

    e1.preventDefault();
    if (dom) {
      const rect = dom.getBoundingClientRect();
      const onMouseMove = (e2: MouseEvent) => {
        if (dom) {
          reize(e1, e2, rect, dom);
        }
      };
      document.addEventListener("mousemove", onMouseMove);
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mouseup", onMouseUp);
    }
  };

  const onDoubleClick = () => {
    const newRest = size?.reset ?? size?.max;
    if (newRest) {
      const dom =
        resizeDom instanceof HTMLElement
          ? resizeDom
          : typeof resizeDom === "function"
          ? resizeDom()
          : document.getElementById(resizeDom);

      const reset = typeof newRest === "function" ? newRest() : newRest;
      if (dom) {
        if (direction === "vertical") {
          dom.style.height = reset + "px";
        } else {
          dom.style.width = reset + "px";
        }
      }
    }
  };

  const onMouseUp = () => {
    const dom =
      resizeDom instanceof HTMLElement
        ? resizeDom
        : typeof resizeDom === "function"
        ? resizeDom()
        : document.getElementById(resizeDom);

    onResizeEnd?.(Number(dom?.style.height.split("px")[0]));
  };

  // children异常处理
  try {
    const child = React.Children.only(children) as React.ReactElement;
    return (
      <child.type
        {...child.props}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onMouseUp={onMouseUp}
      >
        {child.props.children}
      </child.type>
    );
  } catch (error) {
    return null;
  }
};

export default Resizer;
