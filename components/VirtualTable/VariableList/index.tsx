import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import { GiveOutsideFun, VirtualTableData, VirtualTableProps } from '..';
import { useUpdateEffect } from 'ahooks';

type VariableListProps = {
  width: number;
  height: number | (() => number);
  totalWidth: string;
  className?: string;
} & Pick<
  VirtualTableProps,
  | 'data'
  | 'rowHeight'
  | 'colums'
  | 'defaultTopExpanded'
  | 'onRow'
  | 'onCell'
  | 'expandable'
  | 'ref'
  | 'expandIcon'
  | 'rowKey'
>;

const VariableList = React.memo(
  React.forwardRef<GiveOutsideFun, VariableListProps>((props, ref) => {
    const {
      width,
      height,
      totalWidth,
      rowHeight = 50,
      colums,
      defaultTopExpanded = true,
      onRow,
      onCell,
      className,
      expandable,
      expandIcon,
      rowKey = 'id',
    } = props;

    const variableSizeList = useRef<List>(null);
    const [data, setData] = useState([...props.data]);

    //记录展开的id和对应children的数量
    const [recordUnfold, setRecordUnfold] = useState(new Map());

    //默认展开第一层级时
    useEffect(() => {
      if (expandable?.expandableRowIds) {
        //受外部控制是否展开
        return;
      }
      if (defaultTopExpanded) {
        setData((data) => {
          data.forEach((item, index) => {
            if (item.children) {
              data.splice(index + 1, 0, ...item.children);
              setRecordUnfold((recordUnfold) => {
                recordUnfold.set(item[rowKey], item.children?.length);
                return recordUnfold;
              });
            }
          });
          return [...data];
        });
      }
    }, []);

    const nowIndex = useRef(0);

    //根据展开id展开数据
    function unfoldData(
      unfoldIds: string[],
      totalData: VariableListProps['data'],
      nowData: VariableListProps['data'],
      recordId: string[],
    ) {
      nowData.forEach((item) => {
        nowIndex.current += 1;
        recordId.push(item[rowKey]);
        if (unfoldIds.includes(item[rowKey]) && item.children && item.children.length) {
          totalData.splice(nowIndex.current, 0, ...item.children);
          //记录展开
          setRecordUnfold((recordUnfold) => {
            recordUnfold.set(item[rowKey], item.children?.length);
            return recordUnfold;
          });
          unfoldData(unfoldIds, totalData, item.children, recordId);
        }
      });
    }
    //数据更新时
    useUpdateEffect(() => {
      setData(() => {
        let ids: string[] = [];
        let newData = [...props.data];

        let expandableRowIds = expandable?.expandableRowIds
          ? [...expandable.expandableRowIds]
          : [...recordUnfold.keys()];
        nowIndex.current = 0;
        unfoldData(expandableRowIds, newData, props.data, ids);

        //数据减少的情况下，删除被移除的展开记录
        if (newData.length < data.length) {
          setRecordUnfold((recordUnfold) => {
            for (let key of recordUnfold.keys()) {
              if (!ids.includes(key)) {
                recordUnfold.delete(key);
              }
            }
            return recordUnfold;
          });
        }
        return newData;
      });
    }, [props.data]);

    //受控时
    useEffect(() => {
      if (!expandable?.expandableRowIds) return;

      //清空展开记录
      setRecordUnfold((set) => {
        set.clear();
        return set;
      });

      let ids: string[] = [];
      let newData = [...props.data];
      //需要展开的id
      let expandableRowIds = [...expandable.expandableRowIds];

      nowIndex.current = 0;
      unfoldData(expandableRowIds, newData, props.data, ids);
      setData(newData);
    }, [expandable?.expandableRowIds]);

    //点击展开
    const clickUnfold = (rowIndex: number, itemData: VirtualTableData) => {
      //展开时的回调函数
      expandable?.onExpand?.(true, [...recordUnfold.keys()], itemData);
      if (expandable?.expandableRowIds) {
        //受外部控制是否展开
        return;
      }
      setData((data) => {
        data.splice(rowIndex + 1, 0, ...(itemData.children ?? []));
        return [...data];
      });
      setRecordUnfold((recordUnfold) => {
        //父级id
        const parentId = itemData.previousLevelId;
        //展开的子级数量
        const childrenCount = itemData.children?.length;

        //是否存在父级
        if (parentId) {
          recordUnfold.set(parentId, childrenCount + recordUnfold.get(parentId));
        }
        recordUnfold.set(itemData[rowKey], childrenCount);
        return recordUnfold;
      });
    };

    //点击收起
    const clickShrink = (rowIndex: number, itemData: VirtualTableData) => {
      //收起时的回调函数
      expandable?.onExpand?.(false, [...recordUnfold.keys()], itemData);
      if (expandable?.expandableRowIds) {
        //受外部控制是否收起
        return;
      }
      setData((data) => {
        data.splice(rowIndex + 1, recordUnfold.get(itemData[rowKey]));
        return [...data];
      });
      setRecordUnfold((recordUnfold) => {
        //父级id
        const parentId = itemData.previousLevelId;
        //展开的子级数量
        const childrenCount = itemData.children?.length ?? 0;
        //是否存在父级
        if (parentId) {
          recordUnfold.set(parentId, recordUnfold.get(parentId) - childrenCount);
          recordUnfold.delete(itemData[rowKey]);
        } else {
          recordUnfold.clear();
        }
        return recordUnfold;
      });
    };

    //展开收缩图标
    function getUnfoldShrinkIcon(rowIndex: number, itemData: VirtualTableData) {
      return recordUnfold.has(itemData[rowKey]) ? (
        <CaretDownOutlined className="caretIcon" onClick={() => clickShrink(rowIndex, itemData)} />
      ) : (
        <CaretRightOutlined className="caretIcon" onClick={() => clickUnfold(rowIndex, itemData)} />
      );
    }

    //增加position sticky距离
    function addPositionSticky(style: React.CSSProperties, fixed: 'left' | 'right', columnIndex: number) {
      if (fixed) {
        style['position'] = 'sticky';
        let percent = 0,
          px = 0;
        //根据width是px还是百分比得出width
        function getWidth(columsWidth: typeof colums[0]['width']) {
          if (typeof columsWidth === 'number') {
            px += columsWidth;
          } else {
            if (columsWidth.includes('%')) {
              percent += Number(columsWidth.replace('%', ''));
            } else if (columsWidth.includes('px')) {
              px += Number(columsWidth.replace('px', ''));
            }
          }
        }

        if (fixed === 'left') {
          for (let i = 0; i < columnIndex; i++) {
            getWidth(colums[i].width);
          }
        } else if (fixed === 'right') {
          for (let i = colums.length - 1; i > columnIndex; i--) {
            getWidth(colums[i].width);
          }
        }
        style[fixed] = `calc( ${px}px + ${percent}% )`;
      }
    }

    //可视区域的高度
    const newHeight = useMemo(() => (typeof height === 'function' ? height() : height), [height]);

    const overscanStartIndex = useRef(0);

    useMemo(() => {
      //去除缓存重新计算高度
      variableSizeList.current?.resetAfterIndex(overscanStartIndex.current + 1, false);
    }, [data]);

    //滚动到对应id
    const scrollToId = (rowId: string) => {
      let rowIndex = data.findIndex((item) => item[rowKey] === rowId);
      variableSizeList.current?.scrollToItem(rowIndex, 'center');
    };

    //挂载内部滚动方法
    useMemo(() => {
      if (ref && 'current' in ref) {
        if (className === 'virtualTableHead') {
          if (ref.current === null) {
            ref.current = { topScrollToItem: scrollToId };
          } else {
            ref.current.topScrollToItem = scrollToId;
          }
        } else {
          if (ref.current === null) {
            ref.current = { scrollToItem: scrollToId };
          } else {
            ref.current.scrollToItem = scrollToId;
          }
        }
      }
    }, [scrollToId]);

    return (
      <List
        height={newHeight}
        itemCount={data.length}
        itemSize={(rowIndex) => (typeof rowHeight === 'function' ? rowHeight(data[rowIndex]) : rowHeight)}
        itemKey={(rowIndex) => data[rowIndex][rowKey]}
        width={width}
        itemData={data}
        ref={variableSizeList}
        onItemsRendered={(info) => {
          overscanStartIndex.current = info.overscanStartIndex;
        }}
        className={className}
      >
        {({
          index: rowIndex,
          data,
          style,
        }: {
          index: number;
          data: VirtualTableData[];
          style: React.CSSProperties;
        }) => {
          let itemData = data[rowIndex];

          return (
            <div
              id={itemData[rowKey]}
              style={{ ...style, display: 'flex', width: totalWidth }}
              {...onRow?.(itemData, rowIndex)}
            >
              {colums.map((item, columnIndex) => {
                let renderItem = item.render
                  ? item.render(itemData[item.dataIndex], itemData, rowIndex)
                  : itemData[item.dataIndex];

                let style: React.CSSProperties = {
                  width: item.width,
                };
                let className = 'virtualTableCell';
                if (item.fixed) {
                  addPositionSticky(style, item.fixed, columnIndex);
                  if (item.fixed === 'left') {
                    className += ` fixLeft`;
                    if (columnIndex < colums.length - 1 && colums[columnIndex + 1].fixed !== 'left') {
                      className += ` fixLeftLast`;
                    }
                  } else if (item.fixed === 'right') {
                    className += ` fixRight`;
                    if (columnIndex < colums.length - 1 && colums[columnIndex + 1].fixed !== 'right') {
                      className += ` fixRightLast`;
                    }
                  }
                }
                if (item.align) {
                  style.textAlign = item.align;
                }

                let icon = <></>;
                if (expandIcon) {
                  let bol = expandIcon(item, columnIndex, itemData, rowIndex);
                  if (bol) {
                    icon = getUnfoldShrinkIcon(rowIndex, itemData);
                  }
                } else if (itemData?.children && itemData.children?.length > 0 && columnIndex === 0) {
                  icon = getUnfoldShrinkIcon(rowIndex, itemData);
                }

                return (
                  <span
                    key={`${itemData[rowKey]}${columnIndex}${rowIndex}`}
                    className={className}
                    style={style}
                    {...onCell?.(itemData, rowIndex, columnIndex)}
                  >
                    {icon}

                    {renderItem}
                  </span>
                );
              })}
            </div>
          );
        }}
      </List>
    );
  }),
);

export default VariableList;
