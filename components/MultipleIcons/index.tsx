import React, {
  ReactElement,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover } from "antd";
import { MessageOutlined } from "@ant-design/icons";
/**
 * @icon 省略时的图标
 * @showIconNumber 显示图标数量
 * @automaticCalculationWidth 默认图标占据的宽度（包括margin，padding）
 * 自动根据宽度显示最多可显示数量的图标 会忽略@showIconNumber 传值
 */
const MultipleIcons: React.FC<{
  style?: React.CSSProperties;
  className?: React.HTMLAttributes<HTMLDivElement>["className"];
  icon?: ReactElement;
  children?: ReactElement[];
  showIconNumber?: number;
  automaticCalculationWidth?: number;
}> = React.memo(
  ({
    style,
    children,
    icon,
    showIconNumber = 2,
    className,
    automaticCalculationWidth,
  }) => {
    const ref = useRef<HTMLDivElement>(null);

    //自动计算数量
    const [automaticCalculationNumber, setAutomaticCalculationNumber] =
      useState(1);
    const deferredNumber = useDeferredValue(automaticCalculationNumber);

    useEffect(() => {
      const resizeObserver = new ResizeObserver((entries) => {
        if (automaticCalculationWidth) {
          let width = entries[0].contentRect.width;
          let number = Math.floor(width / automaticCalculationWidth);
          setAutomaticCalculationNumber(!!number ? number : 1);
        }
      });
      ref.current && resizeObserver.observe(ref.current);
      return () => {
        ref.current && resizeObserver.unobserve(ref.current);
      };
    }, []);

    const child = useMemo(() => {
      let arryChildren = React.Children.toArray(children);
      let number = automaticCalculationWidth ? deferredNumber : showIconNumber;

      if (arryChildren.length === 0) {
        return null;
      } else {
        return (
          <>
            {arryChildren.slice(0, number - 1)}
            {arryChildren.length <= number ? (
              arryChildren.slice(number - 1)
            ) : (
              <Popover content={arryChildren.slice(number - 1)}>
                {icon ?? <MessageOutlined />}
              </Popover>
            )}
          </>
        );
      }
    }, [children, deferredNumber]);

    return (
      <div
        style={{
          display: "flex",
          columnGap: 5,
          alignItems: "center",
          justifyContent: "center",
          height: 15,
          ...style,
        }}
        className={className}
        ref={ref}
      >
        {child}
      </div>
    );
  }
);

export default MultipleIcons;
