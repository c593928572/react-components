import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import Resizer from "./Resizer";
import VariableList from "./VariableList";
import "./index.less";

export type columsType = {
  title: string | React.ReactElement;
  dataIndex: string;
  /**
   * width string只能传px或%
   */
  width: number | string;
  fixed?: "left" | "right";
  render?: (text: string, record: any, index: number) => JSX.Element;
  align?: "left" | "right" | "center";
}[];

export type VirtualTableData = Record<string, any> & {
  children?: VirtualTableData[];
};

//内部传递给外部的挂载方法
export type GiveOutsideFun = {
  scrollToItem?: (rowId: string) => void;
  topScrollToItem?: (rowId: string) => void;
};
/**
 * @expandableRowIds 指定展开的行id
 * @onExpand 点击展开图标时触发
 */
export type ExpandableConfig = {
  expandableRowIds?: Set<string>;
  onExpand?: (
    expanded: boolean,
    expandableRowIds: string[],
    record: VirtualTableData
  ) => void;
};
/**
 * @rowHeight 行高
 * @colums 列描述数据对象
 * @scroll 滚动区域的宽、高
 * @data 数据
 * @topData 置顶数据
 * @defaultTopExpanded   是否默认展开顶层行
 * @defaultTopHeight  置顶时的默认高度
 * @onHeaderRow 设置头部行dom事件
 * @onRow 设置内容行dom事件
 * @onHeaderCell 设置头部单元格dom事件
 * @onCell 设置内容单元格dom事件
 * @scrollyWidth 纵向滚动条宽度  如更改了滚动条样式，头部与内容对不齐后更改此属性
 * @expandable 展开功能的配置
 * @topExpandable 置顶展开功能的配置
 * @ref ref连接到容器内部
 * @expandIcon 是否渲染展开收缩图标的逻辑
 * @rowKey 数据唯一值，默认为id
 */
export type VirtualTableProps = {
  rowHeight?: number | ((rowData: VirtualTableData) => number);
  colums: columsType;
  data: VirtualTableData[];
  topData?: VirtualTableData[];
  scroll?: { x?: number; y?: number };
  defaultTopExpanded?: boolean;
  defaultTopHeight?: number;
  onHeaderRow?: (colums: columsType) => React.DOMAttributes<HTMLDivElement>;
  onRow?: (
    rowData: VirtualTableData,
    rowIndex: number
  ) => React.DOMAttributes<HTMLDivElement> &
    Pick<React.HTMLAttributes<HTMLDivElement>, "className">;
  onHeaderCell?: (
    colums: columsType[0],
    colIndex: number
  ) => React.DOMAttributes<HTMLDivElement>;
  onCell?: (
    rowData: VirtualTableData,
    rowIndex: number,
    colIndex: number
  ) => React.DOMAttributes<HTMLDivElement>;
  scrollyWidth?: number;
  expandable?: ExpandableConfig;
  topExpandable?: ExpandableConfig;
  ref?: React.MutableRefObject<GiveOutsideFun>;
  expandIcon?: (
    colData: columsType[0],
    colIndex: number,
    rowData: VirtualTableData,
    rowIndex: number
  ) => boolean;
  rowKey?: string;
};

const VirtualTable = React.forwardRef<GiveOutsideFun, VirtualTableProps>(
  (props, ref) => {
    const { scroll, colums, defaultTopHeight = 100, scrollyWidth = 12 } = props;

    const tableHeadRef = useRef<HTMLDivElement>();
    const [tableBody, setTableBody] = useState<HTMLDivElement>();

    //横向滚动条滚动时
    useEffect(() => {
      if (!(tableBody instanceof HTMLElement)) {
        return;
      }
      const handleScroll = (e: Event) => {
        //头部对应滚动
        if (tableHeadRef.current instanceof HTMLElement) {
          tableHeadRef.current.parentElement!.scrollLeft = (
            e.target as HTMLDivElement
          ).scrollLeft;
        }
        //有置顶数据时，置顶数据置顶table对应滚动
        if (props.topData && tableBody?.firstElementChild) {
          tableBody.firstElementChild.scrollLeft = (
            e.target as HTMLDivElement
          ).scrollLeft;
        }
      };
      tableBody.lastElementChild?.addEventListener("scroll", handleScroll);
      return () => {
        tableBody.lastElementChild?.removeEventListener("scroll", handleScroll);
      };
    }, [tableBody]);

    //增加position sticky距离
    function addPositionSticky(
      style: React.CSSProperties,
      fixed: "left" | "right",
      columnIndex: number
    ) {
      if (fixed) {
        style["position"] = "sticky";
        let percent = 0,
          px = 0;
        //根据width是px还是百分比得出width
        function getWidth(columsWidth: typeof colums[0]["width"]) {
          if (typeof columsWidth === "number") {
            px += columsWidth;
          } else {
            if (columsWidth.includes("%")) {
              percent += Number(columsWidth.replace("%", ""));
            } else if (columsWidth.includes("px")) {
              px += Number(columsWidth.replace("px", ""));
            }
          }
        }

        if (fixed === "left") {
          for (let i = 0; i < columnIndex; i++) {
            getWidth(colums[i].width);
          }
        } else if (fixed === "right") {
          for (let i = colums.length - 1; i > columnIndex; i--) {
            getWidth(colums[i].width);
          }
        }
        style[fixed] = `calc( ${px}px + ${percent}% )`;
      }
    }

    //置顶table的高度
    const [topHeight, setTopHeight] = useState(defaultTopHeight);

    //table的高度计算函数
    const tableHeightCallback = useCallback(
      (height: number) => {
        return props.topData && props.topData.length > 0
          ? height - topHeight - (headerHeight ?? 0) - 8
          : height - (headerHeight ?? 0);
      },
      [tableHeadRef.current, topHeight, props.topData]
    );

    const headerDom = useMemo(() => {
      return colums.map((item, columnIndex) => {
        let style: React.CSSProperties = {
          width: item.width,
        };
        let className = "virtualTableHeadCell";

        if (item.fixed) {
          addPositionSticky(style, item.fixed, columnIndex);
          if (item.fixed === "left") {
            className += ` fixLeft`;
            if (
              columnIndex < colums.length - 1 &&
              colums[columnIndex + 1].fixed !== "left"
            ) {
              className += ` fixLeftLast`;
            }
          } else if (item.fixed === "right") {
            className += ` fixRight`;
            if (
              columnIndex < colums.length - 1 &&
              colums[columnIndex + 1].fixed !== "right"
            ) {
              className += ` fixRightLast`;
            }
          }
        }
        if (item.align) {
          style.textAlign = item.align;
        }
        return (
          <div
            key={item.dataIndex}
            style={style}
            className={className}
            {...props.onHeaderCell?.(item, columnIndex)}
          >
            {item.title}
          </div>
        );
      });
    }, [colums]);

    //总的宽度
    const totalWidth = useMemo(() => {
      let percent = 0,
        px = 0;
      //根据width是px还是百分比得出width
      function getWidth(columsWidth: typeof colums[0]["width"]) {
        if (typeof columsWidth === "number") {
          px += columsWidth;
        } else {
          if (columsWidth.includes("%")) {
            percent += Number(columsWidth.replace("%", ""));
          } else if (columsWidth.includes("px")) {
            px += Number(columsWidth.replace("px", ""));
          }
        }
      }
      colums.forEach((item) => getWidth(item.width));

      return `calc( ${px}px + ${percent}% )`;
    }, [colums]);
    //table表格头高度
    const [headerHeight, setHeaderHeight] = useState<number>();
    return (
      <div
        style={{ width: scroll?.x ?? "100%", height: scroll?.y ?? "100%" }}
        className="virtualTable"
      >
        <AutoSizer>
          {({ height, width }: { width: number; height: number }) => (
            <>
              <div
                style={{
                  width: `calc( ${width}px - ${scrollyWidth}px)`,
                  overflow: "hidden",
                  height: headerHeight,
                }}
              >
                <div
                  ref={(elem) => {
                    if (elem && !headerHeight) {
                      tableHeadRef.current = elem;
                      setHeaderHeight(elem.offsetHeight);
                    }
                  }}
                  className="virtualTableHead"
                  style={{ width: totalWidth }}
                  {...props.onHeaderRow?.(colums)}
                >
                  {headerDom}
                </div>
              </div>
              <div
                style={{ width: width, height: height }}
                className="virtualTableBody"
                ref={(ref) => {
                  if (ref && !tableBody) {
                    setTableBody(ref);
                  }
                }}
              >
                {props.topData && props.topData.length > 0 && (
                  <>
                    <VariableList
                      height={topHeight}
                      width={width}
                      colums={colums}
                      data={props.topData}
                      rowHeight={props.rowHeight}
                      defaultTopExpanded={props.defaultTopExpanded}
                      onRow={props.onRow}
                      totalWidth={totalWidth}
                      className="topVariableTable"
                      expandable={props.topExpandable}
                      ref={ref}
                      expandIcon={props.expandIcon}
                      rowKey={props.rowKey}
                    />
                    <Resizer
                      direction="vertical"
                      resizeDom={() =>
                        tableBody?.firstElementChild as HTMLElement
                      }
                      size={{ min: 0 }}
                      onResizeEnd={(height) => setTopHeight(height)}
                    >
                      <div className={"divisionBox"}></div>
                    </Resizer>
                  </>
                )}

                <VariableList
                  height={tableHeightCallback(height)}
                  width={width}
                  colums={colums}
                  data={props.data}
                  rowHeight={props.rowHeight}
                  defaultTopExpanded={props.defaultTopExpanded}
                  onRow={props.onRow}
                  totalWidth={totalWidth}
                  className="variableTable"
                  expandable={props.expandable}
                  ref={ref}
                  expandIcon={props.expandIcon}
                  rowKey={props.rowKey}
                />
              </div>
            </>
          )}
        </AutoSizer>
      </div>
    );
  }
);

export default VirtualTable;
